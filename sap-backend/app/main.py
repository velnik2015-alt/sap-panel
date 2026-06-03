from fastapi import FastAPI
from app.api.v1.models import router as models_router

app = FastAPI(
    title="SAP (Smart Assistant Panel) API",
    version="0.1.0",
    description="Бэкенд автоматизации для интеграции с Tauri и AdsPower"
)

# Подключаем роутер моделей
app.include_router(models_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"status": "ok", "message": "SAP Backend is running"}