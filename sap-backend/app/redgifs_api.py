import aiohttp
from typing import Dict, List

REDGIFS_TAGS_URL = "https://api.redgifs.com/v2/tags"

# Захардкодим базовые 10 макро-ниш для автоматической группировки тегов
NICHES_MAP = {
    "Amateur": ["amateur", "verified", "homemade", "selfie"],
    "Anal": ["anal", "ass", "butt", "peg", "gape"],
    "Ebony": ["ebony", "black", "interracial"],
    "Asian": ["asian", "korean", "japanese", "hentai"],
    "Latina": ["latina", "spanish", "mexican"],
    "MILF": ["milf", "mature", "mom"],
    "Cosplay": ["cosplay", "gamer", "nerd", "anime"],
    "Hardcore": ["hardcore", "rough", "dp", "gangbang"],
    "Softcore": ["softcore", "solo", "feet", "pantyhose"],
    "BBW": ["bbw", "chubby", "thick"]
}

async def fetch_top_redgifs_tags() -> Dict[str, any]:
    """Стягивает топ тегов с RedGifs и раскладывает их по нишам"""
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(REDGIFS_TAGS_URL, headers=headers, timeout=5) as response:
                if response.status == 200:
                    data = await response.json()
                    # Извлекаем имена тегов (обычно они в массиве 'tags' или 'topTags')
                    raw_tags = [t["id"] for t in data.get("tags", [])[:50]]
                    if not raw_tags:
                        raw_tags = ["amateur", "solo", "ebony", "latina", "milf", "ass", "cosplay", "feet"]
                else:
                    raw_tags = ["amateur", "solo", "ebony", "latina", "milf", "ass", "cosplay", "feet"]
    except Exception:
        # Фолбэк на случай блокировок API RedGifs без прокси
        raw_tags = ["amateur", "solo", "ebony", "latina", "milf", "ass", "cosplay", "feet", "anal", "hardcore"]

    # Группируем теги по 10 нишам на основе NICHES_MAP
    detected_niches = set()
    for tag in raw_tags:
        for niche, keywords in NICHES_MAP.items():
            if any(kw in tag.lower() for kw in keywords):
                detected_niches.add(niche)
                
    # Если напарсилось мало ниш, добиваем до базы
    if len(detected_niches) < 3:
        detected_niches = list(NICHES_MAP.keys())[:10]

    return {
        "tags": raw_tags[:40], # Отдаем 30-40 топовых тегов
        "niches": list(detected_niches)
    }
