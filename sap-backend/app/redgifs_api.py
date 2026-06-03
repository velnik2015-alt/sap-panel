import aiohttp
from typing import Dict

REDGIFS_TAGS_URL = "https://api.redgifs.com/v2/tags"

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

async def fetch_top_redgifs_tags() -> Dict[str, list]:
    """Стягивает топ тегов с RedGifs и раскладывает их по нишам"""
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    # Базовый отказоустойчивый пул на случай если RedGifs забанит IP без прокси
    fallback_tags = ["amateur", "solo", "ebony", "latina", "milf", "ass", "cosplay", "feet", "anal", "hardcore", "homemade", "thighs", "bigboobs", "ebony", "webcam"]
    fallback_niches = list(NICHES_MAP.keys())

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(REDGIFS_TAGS_URL, headers=headers, timeout=4) as response:
                if response.status == 200:
                    data = await response.json()
                    raw_tags = [t["id"] for t in data.get("tags", []) if "id" in t]
                    if not raw_tags:
                        raw_tags = fallback_tags
                else:
                    raw_tags = fallback_tags
    except Exception as e:
        print(f"[⚠️ REDGIFS API] Ошибка запроса, включаю локальный фолбэк: {e}")
        raw_tags = fallback_tags

    # Группировка
    detected_niches = set()
    for tag in raw_tags:
        for niche, keywords in NICHES_MAP.items():
            if any(kw in tag.lower() for kw in keywords):
                detected_niches.add(niche)
                
    if len(detected_niches) < 3:
        detected_niches = fallback_niches

    return {
        "tags": raw_tags[:40],
        "niches": list(detected_niches)[:10]
    }