
window.addEventListener("DOMContentLoaded", () => {
  const modelsList = document.getElementById("models-list");
  if (modelsList) {
    modelsList.innerHTML = `
      <div class="model-card" style="background: rgba(255,255,255,0.1); padding: 10px; margin-top: 10px; border-radius: 6px;">
        <strong>Тестовая модель Amouranth</strong>
        <p style="font-size: 12px; color: rgba(255,255,255,0.6);">Если ты видишь эту надпись, фронтенд полностью подчинился стилям!</p>
      </div>
    `;
  }
});