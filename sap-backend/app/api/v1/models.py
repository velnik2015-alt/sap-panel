from fastapi import APIRouter, HTTPException, status
from typing import List
from app.schemas.models import ModelCreate, ModelResponse

router = APIRouter(prefix="/models", tags=["Models"])

# Временное хранилище прямо в оперативной памяти (вместо БД)
MOCK_MODELS_DB = [
    {
        "id": 1,
        "name": "Amouranth",
        "tags": ["nsfw", "bikini"],
        "groups": ["Top-A"],
        "proxy": "http://proxyuser:proxypass@192.168.1.1:8000"
    }
]

@router.get("/", response_model=List[ModelResponse])
async def get_models():
    """Получить список всех профилей моделей (для Tauri-панели)"""
    return MOCK_MODELS_DB

@router.post("/", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
async def create_model(model_data: ModelCreate):
    """Создать новый профиль модели"""
    # Генерируем фейковый инкремент ID
    new_id = max([m["id"] for m in MOCK_MODELS_DB]) + 1 if MOCK_MODELS_DB else 1
    
    # Превращаем Pydantic-схему в словарь и добавляем ID
    new_model = model_data.model_dump()
    new_model["id"] = new_id
    
    # Удаляем токены из ответа, но "сохраняем" их внутри нашей мок-базы
    MOCK_MODELS_DB.append(new_model)
    
    return new_model
@router.put("/{model_id}", response_model=ModelResponse)
async def update_model(model_id: int, model_data: ModelCreate):
    """Обновить данные профиля модели по ID"""
    for model in MOCK_MODELS_DB:
        if model["id"] == model_id:
            # Обновляем поля из прилетевшей Pydantic-схемы
            model.update(model_data.model_dump())
            return model
            
    raise HTTPException(status_code=404, detail="Модель не найдена")

@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(model_id: int):
    """Удалить профиль модели по ID"""
    global MOCK_MODELS_DB
    for index, model in enumerate(MOCK_MODELS_DB):
        if model["id"] == model_id:
            MOCK_MODELS_DB.pop(index)
            return  # HTTP 204 не возвращает тело ответа
            
    raise HTTPException(status_code=404, detail="Модель не найдена")