import aiohttp
import asyncio
from fastapi import HTTPException
from typing import Dict, Any, Optional

REDGIFS_TOKEN_URL = "https://api.redgifs.com/v2/auth/temporary"
REDGIFS_TAGS_URL = "https://api.redgifs.com/v2/tags"
REDGIFS_NICHES_URL = "https://api.redgifs.com/v2/niches"

async def fetch_top_redgifs_tags(refresh_token: Optional[str] = None) -> Dict[str, Any]:
    """
    Парсит живые теги и ниши напрямую через твой IP (без прокси).
    Сначала получает легитимный гостевой Access Token с серверов RedGifs для прохода авторизации.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://www.redgifs.com",
        "Referer": "https://www.redgifs.com/"
    }

    async with aiohttp.ClientSession() as session:
        # Инициализируем токен авторизации
        access_token = None

        # Шаг 1: Получаем живой временный токен, который сам RG использует для незалогиненных пользователей
        try:
            async with session.get(REDGIFS_TOKEN_URL, headers=headers, timeout=5) as token_resp:
                if token_resp.status == 200:
                    token_data = await token_resp.json()
                    access_token = token_data.get("token")
                else:
                    print(f"[⚠️ RG AUTH] Статус получения токена: {token_resp.status}")
        except Exception as e:
            print(f"[⚠️ RG AUTH] Не удалось достучаться до auth-сервера: {e}")

        # Если токен получен, добавляем его в заголовки (без Bearer токена RG не отдаст теги)
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        else:
            raise HTTPException(status_code=502, detail="Could not obtain required temporary token from RedGifs")

        # Шаг 2: Напрямую выкачиваем теги и ниши
        try:
            tags_task = session.get(REDGIFS_TAGS_URL, headers=headers, timeout=6)
            niches_task = session.get(REDGIFS_NICHES_URL, headers=headers, timeout=6)
            
            tags_resp, niches_resp = await asyncio.gather(tags_task, niches_task)

            if tags_resp.status != 200 or niches_resp.status != 200:
                raise HTTPException(
                    status_code=502, 
                    detail=f"RedGifs blocked data request. Tags code: {tags_resp.status}, Niches code: {niches_resp.status}"
                )

            tags_data = await tags_resp.json()
            niches_data = await niches_resp.json()

            # Вытаскиваем трендовые теги
            raw_tags = [t["id"] for t in tags_data.get("tags", []) if "id" in t]
            if not raw_tags:
                raw_tags = [t["id"] for t in tags_data.get("topTags", []) if "id" in t]
                
            raw_niches_data = niches_data.get("niches", [])

            niches_list = []
            relations = {}

            # Парсим ниши и выстраиваем карту зависимостей
            for item in raw_niches_data:
                niche_id = item.get("id") or item.get("name")
                if not niche_id:
                    continue
                
                niches_list.append(niche_id)
                associated_tags = item.get("tags", []) or item.get("searchTags", []) or []
                
                for t in associated_tags:
                    if not isinstance(t, str):
                        continue
                    t_lower = t.lower()
                    
                    if t_lower not in relations:
                        relations[t_lower] = []
                    if niche_id not in relations[t_lower]:
                        relations[t_lower].append(niche_id)

                    if t_lower not in raw_tags:
                        raw_tags.append(t_lower)

            return {
                "tags": list(set(raw_tags))[:50],
                "niches": niches_list,
                "relations": relations
            }

        except HTTPException as http_err:
            raise http_err
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Live parsing error: {str(e)}")