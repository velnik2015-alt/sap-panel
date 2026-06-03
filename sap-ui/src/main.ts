// Интерфейс для типизации данных профиля
interface Model {
  id: number;
  name: string;
  tags: string[];
  groups: string[];
  proxy: string;
}

// Асинхронная функция загрузки моделей с бэкенда FastAPI
async function loadModels(): Promise<void> {
  const modelsListContainer = document.getElementById("models-list");
  if (!modelsListContainer) return;

  try {
    const response = await fetch("http://127.0.0.1:8000/api/v1/models/");
    
    if (!response.ok) {
      throw new Error(`Ошибка сервера: ${response.status}`);
    }

    const models: Model[] = await response.json();
    
    // Очищаем текстовый индикатор загрузки
    modelsListContainer.innerHTML = "";

    if (models.length === 0) {
      modelsListContainer.innerHTML = '<div style="color: #aaa;">Список моделей пуст</div>';
      return;
    }

    // Рендерим карточку модели в Glassmorphism-интерфейс
    modelsListContainer.innerHTML = models.map(model => `
      <div class="model-card">
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px; color: #fff;">
          ${model.name}
        </div>
        <div style="font-size: 12px; color: #ff79c6; margin-bottom: 4px;">
          Группы: ${model.groups.join(", ")}
        </div>
        <div style="font-size: 11px; color: #8be9fd;">
          Теги: ${model.tags.map(t => `#${t}`).join(" ")}
        </div>
      </div>
    `).join("");

  } catch (error) {
    console.error("Ошибка API:", error);
    modelsListContainer.innerHTML = `
      <div style="color: #ff5555; font-size: 13px; font-weight: bold;">
        Ошибка API: убедитесь, что бэкенд запущен
      </div>
    `;
  }
}

// Инициализация при полной загрузке DOM-структуры
window.addEventListener("DOMContentLoaded", () => {
  loadModels();
});