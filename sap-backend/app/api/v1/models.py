from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.storage import load_from_json, save_to_json
from app.redgifs_api import fetch_top_redgifs_tags

router = APIRouter(prefix="/models", tags=["Models"])

# Входящая валидация под нашу новую Glassmorphic-форму
class ModelCreate(BaseModel):
    name: str
    token: Optional[str] = ""
    niches: List[str] = []
    tags: List[str] = []

class ModelResponse(ModelCreate):
    pass

@router.get("/", response_model=List[ModelResponse])
async def get_models():
    """Отдает список всех сохраненных моделей в Tauri"""
    return await load_from_json()

@router.post("/", response_model=ModelResponse)
async def create_model(model: ModelCreate):
    """Принимает новую модель из Окошка и сохраняет в JSON-сессию"""
    models = await load_from_json()
    
    # Проверка на дубликаты
    if any(m["name"].lower() == model.name.lower() for m in models):
        raise HTTPException(status_code=400, detail="Модель с таким именем уже существует")
        
    new_model_dict = model.model_dump()
    models.append(new_model_dict)
    
    await save_to_json(models)
    return model

@router.get("/redgifs-meta")
async def get_redgifs_meta(token: Optional[str] = None):
    """Динамический эндпоинт мета-данных с поддержкой авторизации токена модели"""
    meta = await fetch_top_redgifs_tags(refresh_token=token)
    return meta

@router.put("/{model_name}", response_model=ModelResponse)
async def update_model(model_name: str, model: ModelCreate):
    """Обновляет существующую модель по её имени"""
    models = await load_from_json()
    
    for idx, m in enumerate(models):
        if m["name"].lower() == model_name.lower():
            models[idx] = model.model_dump()
            await save_to_json(models)
            return model
            
    raise HTTPException(status_code=404, detail="Модель не найдена для обновления")