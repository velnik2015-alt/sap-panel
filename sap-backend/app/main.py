from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.models import router as models_router

app = FastAPI(
    title="SAP Backend Core",
    version="0.1.0"
)

# НАСТРОЙКА CORS ДЛЯ TAURI
origins = [
    "http://localhost:1420",     # Дефолтный порт Vite/Tauri при разработке
    "http://127.0.0.1:1420",
    "tauri://localhost",         # Origin продакшн-сборки Tauri под Windows
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],         # Разрешаем GET, POST, OPTIONS и т.д.
    allow_headers=["*"],         # Разрешаем любые заголовки (Content-Type)
)

# Подключение роутеров
app.include_router(models_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"status": "SAP Backend is running online"}