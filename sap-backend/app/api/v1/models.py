from fastapi import APIRouter, HTTPException
from app.schemas.models import ModelCreate, ModelResponse
from app.storage import load_models_from_file, save_models_to_file

router = APIRouter(prefix="/models", tags=["Models"])

@router.get("/", response_model=list[ModelResponse])
async def get_models():
    return await load_models_from_file()

@router.post("/", response_model=ModelResponse)
async def create_model(model_data: ModelCreate):
    models = await load_models_from_file()
    
    # Генерация ID
    new_id = max([m["id"] for m in models], default=0) + 1
    
    new_model = {
        "id": new_id,
        "name": model_data.name,
        "tags": model_data.tags or [],
        "group": model_data.group or "Default"
    }
    
    models.append(new_model)
    await save_models_to_file(models)
    return new_model