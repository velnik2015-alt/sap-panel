interface Model {
  id: number;
  name: string;
  tags: string[];
  group: string;
}

const API_URL = "http://127.0.0.1:8000/api/v1/models/";

async function testBackend() {
  try {
    const r = await fetch("http://127.0.0.1:8000/health");

    console.log("STATUS:", r.status);

    const data = await r.json();

    console.log("BACKEND:", data);
  } catch (e) {
    console.error("BACKEND DEAD:", e);
  }
}

async function loadModels() {
  const listContainer = document.getElementById("models-list");

  if (!listContainer) return;

  try {
    console.log("Loading models...");

    const response = await fetch(API_URL);

    console.log("Response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const models: Model[] = await response.json();

    console.log("Models:", models);

    listContainer.innerHTML = models
      .map(
        (model) => `
        <div class="model-card">
          <div class="model-name">${model.name}</div>
          <div class="model-group">${model.group}</div>
        </div>
      `
      )
      .join("");
  } catch (error) {
    console.error("API ERROR:", error);

    listContainer.innerHTML = `
      <div class="error">
        ${String(error)}
      </div>
    `;
  }
}

async function addModel() {
  const nameInput = document.getElementById(
    "modelName"
  ) as HTMLInputElement;

  if (!nameInput || !nameInput.value.trim()) return;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: nameInput.value.trim(),
        tags: [],
        group: "Default",
      }),
    });

    if (response.ok) {
      nameInput.value = "";
      await loadModels();
    }
  } catch (error) {
    console.error("Не удалось добавить модель:", error);
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  await testBackend();
  await loadModels();

  const addBtn = document.getElementById("addModelBtn");

  addBtn?.addEventListener("click", addModel);
});