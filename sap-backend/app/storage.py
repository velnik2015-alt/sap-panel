import os
import json
import aiofiles

STORAGE_FILE = "models_session.json"

async def load_from_json() -> list:
    """Асинхронно читает список моделей из локального файла-сессии"""
    if not os.path.exists(STORAGE_FILE):
        # Если файла нет, возвращаем дефолтную заглушку-модель
        return [{
            "name": "Amouranth",
            "token": "default_refresh_token_here",
            "niches": ["Amateur", "MILF"],
            "tags": ["solo", "homemade"]
        }]
    
    try:
        async with aiofiles.open(STORAGE_FILE, mode='r', encoding='utf-8') as f:
            content = await f.read()
            if not content.strip():
                return []
            return json.loads(content)
    except Exception:
        return []

async def save_to_json(data: list) -> None:
    """Асинхронно записывает обновленный список моделей на диск"""
    async with aiofiles.open(STORAGE_FILE, mode='w', encoding='utf-8') as f:
        await f.write(json.dumps(data, ensure_ascii=False, indent=4))