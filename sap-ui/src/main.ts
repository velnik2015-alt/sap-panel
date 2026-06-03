interface Model {
  id: number;
  name: string;
  tags: string[];
  group: string;
}

const API_URL = "http://127.0.0.1:8000/api/v1/models/";

// Функция загрузки и отрисовки списка
async function loadModels() {
  const listContainer = document.getElementById("models-list");
  if (!listContainer) return;

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Ошибка сервера");
    
    const models: Model[] = await response.json();
    
    listContainer.innerHTML = models.map(model => `
      <div class="model-card">
        <div class="model-name">${model.name}</div>
        <div class="model-group">${model.group}</div>
      </div>
    `).join('');
    
  } catch (error) {
    listContainer.innerHTML = `<div class="error">Ошибка API: убедитесь, что бэкенд запущен</div>`;
  }
}

// Функция отправки новой модели (исправлено fn -> function)
async function addModel() {
  const nameInput = document.getElementById("modelName") as HTMLInputElement;
  if (!nameInput || !nameInput.value.trim()) return;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nameInput.value.trim(),
        tags: [],
        group: "Default"
      })
    });

    if (response.ok) {
      nameInput.value = ""; // Очищаем инпут
      await loadModels();   // Перерисовываем список
    }
  } catch (error) {
    console.error("Не удалось добавить модель", error);
  }
}

// Инициализация при старте
window.addEventListener("DOMContentLoaded", () => {
  loadModels();
  
  const addBtn = document.getElementById("addModelBtn");
  addBtn?.addEventListener("click", addModel);
});