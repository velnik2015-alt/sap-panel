import { getCurrentWindow } from '@tauri-apps/api/window';

// --- ИНТЕРФЕЙСЫ ДАННЫХ ДЛЯ КОМПИЛЯТОРА TYPESCRIPT ---
interface Model {
  name: string;
  token?: string;
  niches: string[];
  tags: string[];
}

interface RedGifsMeta {
  niches: string[];
  tags: string[];
  relations: Record<string, string[]>;
}

window.addEventListener("DOMContentLoaded", () => {
  // --- ЭЛЕМЕНТЫ ИНТЕРФЕЙСА ---
  const modelsList = document.getElementById("models-list")!;
  const modal = document.getElementById("model-modal")!;
  const modalTitle = document.getElementById("modal-title")!;
  
  const openModalBtn = document.getElementById("open-modal-btn")!;
  const closeModalBtn = document.getElementById("close-modal-btn")!;
  const closeBtn = document.getElementById("close-btn")!;
  const saveModelBtn = document.getElementById("save-model-btn")!;

  // Шаги пошаговой формы формы
  const steps = [
    document.getElementById("step-1")!,
    document.getElementById("step-2")!,
    document.getElementById("step-3")!,
    document.getElementById("step-4")!
  ];

  // Кнопки управления шагами степпера
  const nextToStep2 = document.getElementById("next-to-step-2")!;
  const nextToStep3 = document.getElementById("next-to-step-3")!;
  const nextToStep4 = document.getElementById("next-to-step-4")!;
  const backToStep1 = document.getElementById("back-to-step-1")!;
  const backToStep2 = document.getElementById("back-to-step-2")!;
  const backToStep3 = document.getElementById("back-to-step-3")!;

  // Текстовые поля, скролл-боксы и счетчики баджей
  const nameInput = document.getElementById("model-name") as HTMLInputElement;
  const tokenInput = document.getElementById("model-token") as HTMLInputElement;
  const nichesContainer = document.getElementById("niches-container")!;
  const tagsContainer = document.getElementById("tags-container")!;
  const nichesCounter = document.getElementById("niches-counter")!;
  const tagsCounter = document.getElementById("tags-counter")!;

  // --- ТЕКУЩЕЕ СОСТОЯНИЕ (STATE) ---
  let selectedNiches: string[] = [];
  let selectedTags: string[] = [];
  let cachedMeta: RedGifsMeta | null = null;
  let isEditing = false; // Режим: создание новой модели (false) или редактирование старой (true)

  // --- 1. СИСТЕМНОЕ ЗАКРЫТИЕ ОКНА TAURI НА УРОВНЕ ОС ---
  closeBtn.addEventListener("click", async () => {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  });

  // --- 2. НАВИГАЦИЯ ПО ШАГАМ ФОРМЫ (СТЕППЕР) ---
  function showStep(stepIndex: number) {
    steps.forEach((step, idx) => {
      if (step) {
        step.style.display = idx === stepIndex ? "block" : "none";
      }
    });
  }

  nextToStep2.addEventListener("click", () => {
    if (!nameInput.value.trim()) return alert("Введите имя модели!");
    showStep(1);
  });
  
  nextToStep3.addEventListener("click", () => {
    showStep(2);
    // Как только переходим к тегам — запускаем нативный сбор мета-данных
    fetchLiveRedGifsMeta(tokenInput.value.trim());
  });
  
  nextToStep4.addEventListener("click", () => showStep(3));
  backToStep1.addEventListener("click", () => showStep(0));
  backToStep2.addEventListener("click", () => showStep(1));
  backToStep3.addEventListener("click", () => showStep(2));

  // --- 3. НАТИВНЫЙ ОБХОД CORS И КЛИЕНТСКИЙ ПАРСИНГ ЧЕРЕЗ RUST-ЯДРО ---
  async function fetchLiveRedGifsMeta(customToken?: string) {
    tagsContainer.innerHTML = "<div class='loading'>Нативный обход Cloudflare...</div>";
    nichesContainer.innerHTML = "<div class='loading'>Нативный обход Cloudflare...</div>";

    let token = customToken || "";
    
    // Эмулируем заголовки чистого браузера Windows без палевных Origin: localhost
    const rgHeaders: Record<string, string> = { 
      "Accept": "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Referer": "https://www.redgifs.com/",
      "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"
    };

    try {
      // Подгружаем нативный HTTP клиент Tauri v2 на лету
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');

      // Шаг А: Если токена модели нет, получаем из Rust гостевой сессионный токен
      if (!token) {
        const authRes = await tauriFetch("https://api.redgifs.com/v2/auth/temporary", { 
          method: "GET",
          headers: rgHeaders 
        });
        if (authRes.ok) {
          const authData: any = await authRes.json();
          token = authData.token || "";
        }
      }

      if (token) {
        rgHeaders["Authorization"] = `Bearer ${token}`;
      }

      // Шаг Б: Тянем теги и ниши параллельно силами ОС, полностью минуя CORS-ограничения браузера
      const [tagsRes, nichesRes] = await Promise.all([
        tauriFetch("https://api.redgifs.com/v2/tags", { method: "GET", headers: rgHeaders }),
        tauriFetch("https://api.redgifs.com/v2/niches", { method: "GET", headers: rgHeaders })
      ]);

      if (!tagsRes.ok || !nichesRes.ok) {
        throw new Error(`RG API Blocked. Tags status: ${tagsRes.status}, Niches status: ${nichesRes.status}`);
      }

      const tagsData: any = await tagsRes.json();
      const nichesData: any = await nichesRes.json();

      let rawTags: string[] = (tagsData.tags || tagsData.topTags || []).map((t: any) => t.id);
      const rawNiches = nichesData.niches || [];

      const nichesList: string[] = [];
      const relations: Record<string, string[]> = {};

      // Шаг В: Обрабатываем структуру ниш и создаем карту живых зависимостей
      rawNiches.forEach((item: any) => {
        const nicheId = item.id || item.name;
        if (!nicheId) return;
        
        if (!nichesList.includes(nicheId)) {
          nichesList.push(nicheId);
        }
        
        const associatedTags = item.tags || item.searchTags || [];
        associatedTags.forEach((t: any) => {
          if (typeof t !== "string") return;
          const tLower = t.toLowerCase();
          
          if (!relations[tLower]) relations[tLower] = [];
          if (!relations[tLower].includes(nicheId)) relations[tLower].push(nicheId);
          if (!rawTags.includes(tLower)) rawTags.push(tLower);
        });
      });

      // Фиксируем чистые данные в кэш приложения
      cachedMeta = {
        tags: Array.from(new Set(rawTags)).slice(0, 50), // Убираем дубликаты, берем топ-50
        niches: nichesList,
        relations: relations
      };

      // Выводим баджи на экран
      renderTags();
      renderNiches();

    } catch (err) {
      console.error("Critical Tauri Native HTTP Parser Error:", err);
      tagsContainer.innerHTML = `<span class='error'>Ошибка авторизации RedGifs. Нативный проход заблокирован.</span>`;
      nichesContainer.innerHTML = `<span class='error'>Ошибка авторизации RedGifs. Нативный проход заблокирован.</span>`;
    }
  }

  // Рендеринг плитки тегов (Шаг 3)
  function renderTags() {
    if (!cachedMeta) return;
    tagsContainer.innerHTML = cachedMeta.tags.map(t => {
      const isSelected = selectedTags.includes(t) ? "selected" : "";
      return `<span class="badge tag-badge ${isSelected}" data-value="${t}">#${t}</span>`;
    }).join('');
    updateCounters();
  }

  // Реактивный рендеринг плитки ниш (Шаг 4) под выбранные теги
  function renderNiches() {
    if (!cachedMeta) return;
    let nichesToRender = cachedMeta.niches;

    // Живой фильтр: если теги выбраны, показываем только те ниши, которые к ним привязаны
    if (selectedTags.length > 0) {
      const activeNichesSet = new Set<string>();
      selectedTags.forEach(tag => {
        const matchingNiches = cachedMeta?.relations?.[tag.toLowerCase()];
        if (matchingNiches) {
          matchingNiches.forEach(n => activeNichesSet.add(n));
        }
      });
      if (activeNichesSet.size > 0) {
        nichesToRender = Array.from(activeNichesSet);
      }
    }

    nichesContainer.innerHTML = nichesToRender.map(n => {
      const isSelected = selectedNiches.includes(n) ? "selected" : "";
      return `<span class="badge niche-badge ${isSelected}" data-value="${n}">${n}</span>`;
    }).join('');

    // Если ниша была выбрана, но исчезла из-за изменения тегов — стираем её из массива
    selectedNiches = selectedNiches.filter(n => nichesToRender.includes(n));
    updateCounters();
  }

  // Обновление цифр счетчиков и проверка лимитов RedGifs (5 ниш, 10 тегов)
  function updateCounters() {
    nichesCounter.innerText = `${selectedNiches.length} / 5`;
    tagsCounter.innerText = `${selectedTags.length} / 10`;

    if (selectedNiches.length >= 5) nichesCounter.classList.add("limit-reached");
    else nichesCounter.classList.remove("limit-reached");

    if (selectedTags.length >= 10) tagsCounter.classList.add("limit-reached");
    else tagsCounter.classList.remove("limit-reached");
  }

  // Делегированные клики по тегам (с живой реактивностью)
  tagsContainer.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains("badge")) return;
    const val = target.getAttribute("data-value")!;

    if (target.classList.contains("selected")) {
      target.classList.remove("selected");
      selectedTags = selectedTags.filter(t => t !== val);
    } else {
      if (selectedTags.length >= 10) return;
      target.classList.add("selected");
      selectedTags.push(val);
    }
    renderNiches(); // Мгновенно перестраиваем ниши на Шаге 4 при клике по тегу
  });

  // Делегированные клики по нишам
  nichesContainer.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains("badge")) return;
    const val = target.getAttribute("data-value")!;

    if (target.classList.contains("selected")) {
      target.classList.remove("selected");
      selectedNiches = selectedNiches.filter(n => n !== val);
    } else {
      if (selectedNiches.length >= 5) return;
      target.classList.add("selected");
      selectedNiches.push(val);
    }
    updateCounters();
  });

  // --- 4. РАБОТА СО СПИСКОМ МОДЕЛЕЙ НА ГЛАВНОМ ЭКРАНЕ ---
  async function loadModels() {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/models/");
      const models: Model[] = await res.json();
      
      modelsList.innerHTML = models.map(m => `
        <div class="model-card" data-model-name="${m.name}">
          <div class="model-info">
            <div class="model-name">✨ ${m.name}</div>
            <div class="model-meta">Ниш выбрано: ${m.niches?.length || 0}</div>
          </div>
        </div>
      `).join('');
    } catch {
      modelsList.innerHTML = '<div class="error">Бэкенд недоступен</div>';
    }
  }

  // Нажатие на карточку открывает сохраненную модель для изменения данных
  modelsList.addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;
    const card = target.closest(".model-card");
    if (!card) return;
    
    const targetName = card.getAttribute("data-model-name")!;
    
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/models/");
      const models: Model[] = await res.json();
      const currentModel = models.find(m => m.name === targetName);
      
      if (currentModel) {
        isEditing = true; // Включаем режим PUT
        modalTitle.innerText = `Изменение: ${currentModel.name}`;
        nameInput.value = currentModel.name;
        nameInput.disabled = true; // Имя заблокировано для правок (оно ключ в JSON)
        tokenInput.value = currentModel.token || "";
        selectedNiches = [...currentModel.niches];
        selectedTags = [...currentModel.tags];
        
        modal.style.display = "flex";
        showStep(0);
        fetchLiveRedGifsMeta(currentModel.token);
      }
    } catch {
      alert("Не удалось загрузить данные модели");
    }
  });

  // Нажатие на 👩‍🦰 сбрасывает модалку в режим создания новой модели
  openModalBtn.addEventListener("click", () => {
    isEditing = false; // Включаем режим POST
    modalTitle.innerText = "Новая модель";
    nameInput.value = "";
    nameInput.disabled = false;
    tokenInput.value = "";
    selectedNiches = [];
    selectedTags = [];
    
    modal.style.display = "flex";
    showStep(0);
    fetchLiveRedGifsMeta();
  });

  // --- 5. СОХРАНЕНИЕ / ОБНОВЛЕНИЕ ДАННЫХ В СЕССИЮ (БАЗУ JSON) ---
  saveModelBtn.addEventListener("click", async () => {
    if (!nameInput.value.trim()) return alert("Имя модели обязательно!");

    const payload = {
      name: nameInput.value.trim(),
      token: tokenInput.value.trim(),
      niches: selectedNiches,
      tags: selectedTags
    };

    const method = isEditing ? "PUT" : "POST";
    const url = isEditing 
      ? `http://127.0.0.1:8000/api/v1/models/${encodeURIComponent(payload.name)}`
      : "http://127.0.0.1:8000/api/v1/models/";

    try {
      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error();

      modal.style.display = "none";
      loadModels();
    } catch {
      alert("Ошибка при сохранении модели. Проверьте бэкенд.");
    }
  });

  closeModalBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Первичный запуск софта
  loadModels();
});