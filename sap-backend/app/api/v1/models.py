from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from app.storage import load_from_json, save_to_json
from app.redgifs_api import fetch_top_redgifs_tags

router = APIRouter(prefix="/models", tags=["Models"])

class ModelCreate(BaseModel):
    name: str
    token: Optional[str] = ""
    niches: List[str] = []
    tags: List[str] = []

class ModelResponse(ModelCreate):
    pass

@router.get("/redgifs-meta")
async def get_redgifs_meta(token: Optional[str] = None):
    """Отдает живые теги напрямую через локальную сеть сервера"""
    meta = await fetch_top_redgifs_tags(refresh_token=token)
    return meta

@router.get("/", response_model=List[ModelResponse])
async def get_models():
    return await load_from_json()

@router.post("/", response_model=ModelResponse)
async def create_model(model: ModelCreate):
    models = await load_from_json()
    if any(m["name"].lower() == model.name.lower() for m in models):
        raise HTTPException(status_code=400, detail="Модель уже существует")
    models.append(model.model_dump())
    await save_to_json(models)
    return model

@router.put("/{model_name}", response_model=ModelResponse)
async def update_model(model_name: str, model: ModelCreate):
    models = await load_from_json()
    for idx, m in enumerate(models):
        if m["name"].lower() == model_name.lower():
            models[idx] = model.model_dump()
            await save_to_json(models)
            return model
    raise HTTPException(status_code=404, detail="Модель не найдена")