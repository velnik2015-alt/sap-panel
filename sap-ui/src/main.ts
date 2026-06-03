interface Model {
  name: string;
  token?: string;
  niches: string[];
  tags: string[];
}

window.addEventListener("DOMContentLoaded", () => {
  const modelsList = document.getElementById("models-list")!;
  const modal = document.getElementById("model-modal")!;
  const openModalBtn = document.getElementById("open-modal-btn")!;
  const closeModalBtn = document.getElementById("close-modal-btn")!;
  const saveModelBtn = document.getElementById("save-model-btn")!;
  
  const nichesContainer = document.getElementById("niches-container")!;
  const tagsContainer = document.getElementById("tags-container")!;

  let selectedNiches: string[] = [];
  let selectedTags: string[] = [];

  // 1. Подгрузка списка моделей
  async function loadModels() {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/models/");
      const models: Model[] = await res.json();
      modelsList.innerHTML = models.map(m => `
        <div class="model-card">
          <div class="model-info">
            <div class="model-name">✨ ${m.name}</div>
            <div class="model-meta">Ниши: ${m.niches?.join(', ') || 'Нет'}</div>
          </div>
        </div>
      `).join('');
    } catch {
      modelsList.innerHTML = '<div class="error">Ошибка загрузки API</div>';
    }
  }

  // 2. Открытие модалки и подтягивание тегов/ниш из RedGifs через бэкенд
  openModalBtn.addEventListener("click", async () => {
    modal.style.display = "flex";
    nichesContainer.innerHTML = "Загрузка ниш...";
    tagsContainer.innerHTML = "Загрузка тегов...";
    
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/models/redgifs-meta");
      const meta = await res.json();
      
      // Рендерим Ниши
      nichesContainer.innerHTML = meta.niches.map((n: string) => `<span class="badge" data-value="${n}">${n}</span>`).join('');
      // Рендерим Теги
      tagsContainer.innerHTML = meta.tags.map((t: string) => `<span class="badge" data-value="${t}">#${t}</span>`).join('');
      
      // Навешиваем клики на баджи
      setupBadgeClicks();
    } catch {
      nichesContainer.innerHTML = "Ошибка загрузки мета-данных";
    }
  });

  function setupBadgeClicks() {
    document.querySelectorAll(".badge").forEach(badge => {
      badge.addEventListener("click", () => {
        const val = badge.getAttribute("data-value")!;
        const isNiche = badge.parentElement?.id === "niches-container";
        
        if (badge.classList.contains("selected")) {
          badge.classList.remove("selected");
          if (isNiche) selectedNiches = selectedNiches.filter(n => n !== val);
          else selectedTags = selectedTags.filter(t => t !== val);
        } else {
          badge.classList.add("selected");
          if (isNiche) selectedNiches.push(val);
          else selectedTags.push(val);
        }
      });
    });
  }

  // 3. Сохранение новой модели
  saveModelBtn.addEventListener("click", async () => {
    const nameInput = document.getElementById("model-name") as HTMLInputElement;
    const tokenInput = document.getElementById("model-token") as HTMLInputElement;

    if (!nameInput.value.trim()) return alert("Введите имя модели");

    const newModel = {
      name: nameInput.value.trim(),
      token: tokenInput.value.trim(),
      niches: selectedNiches,
      tags: selectedTags
    };

    try {
      await fetch("http://127.0.0.1:8000/api/v1/models/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newModel)
      });
      
      modal.style.display = "none";
      nameInput.value = ""; tokenInput.value = "";
      selectedNiches = []; selectedTags = [];
      loadModels();
    } catch {
      alert("Не удалось сохранить модель");
    }
  });

  closeModalBtn.addEventListener("click", () => modal.style.display = "none");
  loadModels();
});