import { getCurrentWindow } from '@tauri-apps/api/window';

interface Model {
  name: string;
  token?: string;
  niches: string[];
  tags: string[];
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

  // Шаги формы
  const steps = [
    document.getElementById("step-1")!,
    document.getElementById("step-2")!,
    document.getElementById("step-3")!,
    document.getElementById("step-4")!
  ];

  // Кнопки навигации по шагам
  const nextToStep2 = document.getElementById("next-to-step-2")!;
  const nextToStep3 = document.getElementById("next-to-step-3")!;
  const nextToStep4 = document.getElementById("next-to-step-4")!;
  const backToStep1 = document.getElementById("back-to-step-1")!;
  const backToStep2 = document.getElementById("back-to-step-2")!;
  const backToStep3 = document.getElementById("back-to-step-3")!;

  // Поля ввода и контейнеры
  const nameInput = document.getElementById("model-name") as HTMLInputElement;
  const tokenInput = document.getElementById("model-token") as HTMLInputElement;
  const nichesContainer = document.getElementById("niches-container")!;
  const tagsContainer = document.getElementById("tags-container")!;
  const nichesCounter = document.getElementById("niches-counter")!;
  const tagsCounter = document.getElementById("tags-counter")!;

  // --- СОСТОЯНИЕ (STATE) ---
  let selectedNiches: string[] = [];
  let selectedTags: string[] = [];
  let cachedMeta: { niches: string[], tags: string[] } | null = null;
  let isEditing = false; // Флаг: редактируем старую модель или создаем новую

  // --- 1. СИСТЕМНЫЕ ФУНКЦИИ ОКНА ---
  closeBtn.addEventListener("click", async () => {
    const appWindow = getCurrentWindow();
    await appWindow.close(); // Жесткое закрытие процесса Tauri
  });

  // --- 2. УПРАВЛЕНИЕ ШАГАМИ ФОРМЫ (СТЕППЕР) ---
  function showStep(stepIndex: number) {
    steps.forEach((step, idx) => {
      step.style.display = idx === stepIndex ? "block" : "none";
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

  // --- 3. ЗАГРУЗКА И КЭШИРОВАНИЕ МЕТА-ДАННЫХ REDGIFS ---
  async function preloadRedGifsMeta() {
    nichesContainer.innerHTML = "<div class='loading'>Синхронизация ниш...</div>";
    tagsContainer.innerHTML = "<div class='loading'>Синхронизация тегов...</div>";
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/models/redgifs-meta");
      if (!res.ok) throw new Error();
      cachedMeta = await res.json();
      renderMetaBadges();
    } catch {
      nichesContainer.innerHTML = "<span class='error'>Ошибка сети бэкенда</span>";
      tagsContainer.innerHTML = "<span class='error'>Ошибка сети бэкенда</span>";
    }
  }

  function renderMetaBadges() {
    if (!cachedMeta) return;
    
    // Рендерим крупные плитки ниш и тегов
    nichesContainer.innerHTML = cachedMeta.niches.map(n => {
      const isSelected = selectedNiches.includes(n) ? "selected" : "";
      return `<span class="badge ${isSelected}" data-value="${n}">${n}</span>`;
    }).join('');

    tagsContainer.innerHTML = cachedMeta.tags.map(t => {
      const isSelected = selectedTags.includes(t) ? "selected" : "";
      return `<span class="badge ${isSelected}" data-value="${t}">#${t}</span>`;
    }).join('');

    updateCounters();
  }

  function updateCounters() {
    nichesCounter.innerText = `${selectedNiches.length} / 5`;
    tagsCounter.innerText = `${selectedTags.length} / 10`;

    if (selectedNiches.length >= 5) nichesCounter.classList.add("limit-reached");
    else nichesCounter.classList.remove("limit-reached");

    if (selectedTags.length >= 10) tagsCounter.classList.add("limit-reached");
    else tagsCounter.classList.remove("limit-reached");
  }

  // Делегирование кликов на баджи (с лимитами)
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
    updateCounters();
  });

  // --- 4. РАБОТА СО СПИСКОМ МОДЕЛЕЙ (ОТКРЫТИЕ И РЕДАКТИРОВАНИЕ) ---
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

  // Клик по карточке модели открывает её для изменения данных
  modelsList.addEventListener("click", async (e) => {
    const card = (e.target as HTMLElement).closest(".model-card");
    if (!card) return;
    
    const targetName = card.getAttribute("data-model-name")!;
    
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/models/");
      const models: Model[] = await res.json();
      const currentModel = models.find(m => m.name === targetName);
      
      if (currentModel) {
        isEditing = true;
        modalToEditMode(currentModel);
      }
    } catch {
      alert("Не удалось загрузить данные модели");
    }
  });

  function modalToEditMode(model: Model) {
    modalTitle.innerText = `Изменение: ${model.name}`;
    nameInput.value = model.name;
    nameInput.disabled = True; // Запрещаем менять имя (оно ключ в базе)
    tokenInput.value = model.token || "";
    selectedNiches = [...model.niches];
    selectedTags = [...model.tags];
    
    modal.style.display = "flex";
    showStep(0);
    renderMetaBadges();
  }

  // Клик по кнопке девушки сбрасывает форму в режим создания новой модели
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
    renderMetaBadges();
    if (!cachedMeta) preloadRedGifsMeta();
  });

  // --- 5. СОХРАНЕНИЕ ДАННЫХ ---
  saveModelBtn.addEventListener("click", async () => {
    if (!nameInput.value.trim()) return alert("Имя модели обязательно!");

    const payload = {
      name: nameInput.value.trim(),
      token: tokenInput.value.trim(),
      niches: selectedNiches,
      tags: selectedTags
    };

    try {
      // Если это редактирование, бэкенд обработает POST как обновление по уникальному имени
      const res = await fetch("http://127.0.0.1:8000/api/v1/models/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error();

      modal.style.display = "none";
      loadModels();
    } catch {
      alert("Ошибка при сохранении модели. Проверьте уникальность имени.");
    }
  });

  closeModalBtn.addEventListener("click", () => modal.style.display = "none");

  // Инициализация при запуске софта
  loadModels();
  preloadRedGifsMeta();
});