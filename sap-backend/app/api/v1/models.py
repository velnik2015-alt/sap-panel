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
async def get_redgifs_meta():
    """Эндпоинт, который Tauri дергает при клике на эмодзи девушки 👩‍🦰"""
    meta = await fetch_top_redgifs_tags()
    return meta