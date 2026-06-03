import { getCurrentWindow } from '@tauri-apps/api/window';

// Четкие интерфейсы данных для компилятора TypeScript
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

  // Массив шагов формы
  const steps = [
    document.getElementById("step-1")!,
    document.getElementById("step-2")!,
    document.getElementById("step-3")!,
    document.getElementById("step-4")!
  ];

  // Кнопки навигации по шагам (степпер)
  const nextToStep2 = document.getElementById("next-to-step-2")!;
  const nextToStep3 = document.getElementById("next-to-step-3")!;
  const nextToStep4 = document.getElementById("next-to-step-4")!;
  const backToStep1 = document.getElementById("back-to-step-1")!;
  const backToStep2 = document.getElementById("back-to-step-2")!;
  const backToStep3 = document.getElementById("back-to-step-3")!;

  // Поля ввода, контейнеры вывода баджей и счетчики
  const nameInput = document.getElementById("model-name") as HTMLInputElement;
  const tokenInput = document.getElementById("model-token") as HTMLInputElement;
  const nichesContainer = document.getElementById("niches-container")!;
  const tagsContainer = document.getElementById("tags-container")!;
  const nichesCounter = document.getElementById("niches-counter")!;
  const tagsCounter = document.getElementById("tags-counter")!;

  // --- СОСТОЯНИЕ ПРИЛОЖЕНИЯ (STATE) ---
  let selectedNiches: string[] = [];
  let selectedTags: string[] = [];
  let cachedMeta: RedGifsMeta | null = null; // Единственная валидная декларация переменной мета-данных
  let isEditing = false; // Флаг режима изменения модели

  // --- 1. СИСТЕМНОЕ ЗАКРЫТИЕ ОКНА TAURI ---
  closeBtn.addEventListener("click", async () => {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  });

  // --- 2. ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ШАГОВ ФОРМЫ ---
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
  
  nextToStep3.addEventListener("click", () => showStep(2));
  nextToStep4.addEventListener("click", () => showStep(3));

  backToStep1.addEventListener("click", () => showStep(0));
  backToStep2.addEventListener("click", () => showStep(1));
  backToStep3.addEventListener("click", () => showStep(2));

  // --- 3. ФОНОВАЯ СИНХРОНИЗАЦИЯ С БЭКЕНДОМ И ВЫВОД БАДЖЕЙ ---
  async function preloadRedGifsMeta() {
    nichesContainer.innerHTML = "<div class='loading'>Синхронизация ниш...</div>";
    tagsContainer.innerHTML = "<div class='loading'>Синхронизация тегов...</div>";
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/models/redgifs-meta");
      if (!res.ok) throw new Error();
      cachedMeta = await res.json();
      
      renderTags();
      renderNiches();
    } catch {
      nichesContainer.innerHTML = "<span class='error'>Ошибка сети бэкенда</span>";
      tagsContainer.innerHTML = "<span class='error'>Ошибка сети бэкенда</span>";
    }
  }

  // Отрендерить большие плитки тегов (Шаг 3)
  function renderTags() {
    if (!cachedMeta) return;
    tagsContainer.innerHTML = cachedMeta.tags.map(t => {
      const isSelected = selectedTags.includes(t) ? "selected" : "";
      return `<span class="badge tag-badge ${isSelected}" data-value="${t}">#${t}</span>`;
    }).join('');
    updateCounters();
  }

  // Отрендерить живые ниши (Шаг 4), отфильтрованные под выбранные теги
  function renderNiches() {
    if (!cachedMeta || !cachedMeta.relations) return;

    let nichesToRender = cachedMeta.niches;

    // Если юзер выбрал теги на предыдущем шаге, запускаем реактивный фильтр
    if (selectedTags.length > 0) {
      const activeNichesSet = new Set<string>();
      
      selectedTags.forEach(tag => {
        const lowerTag = tag.toLowerCase();
        const matchingNiches = cachedMeta?.relations?.[lowerTag];
        
        if (matchingNiches) {
          matchingNiches.forEach((niche: string) => activeNichesSet.add(niche));
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

    // Страховка: если ниша была выбрана, но исчезла из-за нового фильтра тегов, убираем её
    selectedNiches = selectedNiches.filter(n => nichesToRender.includes(n));
    updateCounters();
  }

  // Обновление цифр в счетчиках и проверка лимитов RedGifs (5 ниш, 10 тегов)
  function updateCounters() {
    nichesCounter.innerText = `${selectedNiches.length} / 5`;
    tagsCounter.innerText = `${selectedTags.length} / 10`;

    if (selectedNiches.length >= 5) nichesCounter.classList.add("limit-reached");
    else nichesCounter.classList.remove("limit-reached");

    if (selectedTags.length >= 10) tagsCounter.classList.add("limit-reached");
    else tagsCounter.classList.remove("limit-reached");
  }

  // Делегированные клики по тегам (с живым пересчетом ниш на лету)
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
    
    renderNiches(); // Кликнули тег -> мгновенно обновился список ниш для шага 4
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

  // --- 4. УПРАВЛЕНИЕ СПИСКОМ МОДЕЛЕЙ И ИХ ИЗМЕНЕНИЕМ ---
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

  // Клик по плитке модели открывает её данные для изменения
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
        isEditing = true; // Переключаемся в режим изменения
        modalTitle.innerText = `Изменение: ${currentModel.name}`;
        nameInput.value = currentModel.name;
        nameInput.disabled = true; // Фиксируем имя (оно является ID записи)
        tokenInput.value = currentModel.token || "";
        selectedNiches = [...currentModel.niches];
        selectedTags = [...currentModel.tags];
        
        modal.style.display = "flex";
        showStep(0);
        renderTags();
        renderNiches();
      }
    } catch {
      alert("Не удалось загрузить данные модели");
    }
  });

  // Нажатие на 👩‍🦰 сбрасывает форму в режим создания новой модели с нуля
  openModalBtn.addEventListener("click", () => {
    isEditing = false;
    modalTitle.innerText = "Новая модель";
    nameInput.value = "";
    nameInput.disabled = false;
    tokenInput.value = "";
    selectedNiches = [];
    selectedTags = [];
    
    modal.style.display = "flex";
    showStep(0);
    renderTags();
    renderNiches();
    if (!cachedMeta) preloadRedGifsMeta();
  });

// --- 5. СОХРАНЕНИЕ / ОБНОВЛЕНИЕ ДАННЫХ В СЕССИЮ ---
  saveModelBtn.addEventListener("click", async () => {
    if (!nameInput.value.trim()) return alert("Имя модели обязательно!");

    const payload = {
      name: nameInput.value.trim(),
      token: tokenInput.value.trim(),
      niches: selectedNiches,
      tags: selectedTags
    };

    // Используем isEditing для выбора метода запроса (убирает варнинг)
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
      alert("Ошибка сохранения. Проверьте соединение с бэкендом.");
    }
  });

  closeModalBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Автостарт при инициализации Окошка
  loadModels();
  preloadRedGifsMeta();
});