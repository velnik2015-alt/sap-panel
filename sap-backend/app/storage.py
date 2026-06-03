import json
import os
import aiofiles

STORAGE_FILE = "models_session.json"

async def load_models_from_file() -> list:
    if not os.path.exists(STORAGE_FILE):
        # Дефолтный мок, если файла еще нет
        default_data = [{
            "id": 1,
            "name": "Amouranth",
            "tags": ["redhead", "bikini"],
            "group": "VIP"
        }]
        async with aiofiles.open(STORAGE_FILE, mode="w", encoding="utf-8") as f:
            await f.write(json.dumps(default_data, ensure_ascii=False, indent=4))
        return default_data

    async with aiofiles.open(STORAGE_FILE, mode="r", encoding="utf-8") as f:
        content = await f.read()
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return []

async def save_models_to_file(models: list):
    async with aiofiles.open(STORAGE_FILE, mode="w", encoding="utf-8") as f:
        await f.write(json.dumps(models, ensure_ascii=False, indent=4))