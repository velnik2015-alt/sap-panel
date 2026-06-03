from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional

# Общие поля для профиля модели
class ModelBase(BaseModel):
    name: str = Field(..., description="Имя/Никнейм модели")
    tags: List[str] = Field(default=[], description="Список сабреддитов или тегов")
    groups: List[str] = Field(default=[], description="Группы для сортировки")
    proxy: Optional[str] = Field(None, description="Индивидуальный прокси (format: http://user:pass@ip:port)")

# Схема для создания (то, что прилетает в POST-запросе)
class ModelCreate(ModelBase):
    reddit_token: Optional[str] = Field(None, description="Токен авторизации Reddit")
    redgifs_token: Optional[str] = Field(None, description="Токен авторизации RedGifs")

# Схема для ответа (то, что отдаем в GET-запросах, маскируя или убирая токены из соображений безопасности)
class ModelResponse(ModelBase):
    id: int = Field(..., description="Уникальный ID профиля")

    class Config:
        from_attributes = True