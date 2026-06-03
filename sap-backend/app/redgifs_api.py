import aiohttp
import asyncio
from fastapi import HTTPException
from typing import Dict, Any, Optional

REDGIFS_TEMPORARY_AUTH_URL = "https://api.redgifs.com/v2/auth/temporary"
REDGIFS_TAGS_URL = "https://api.redgifs.com/v2/tags"
REDGIFS_NICHES_URL = "https://api.redgifs.com/v2/niches"

async def fetch_top_redgifs_tags(refresh_token: Optional[str] = None) -> Dict[str, Any]:
    """
    Парсит живые теги и ниши прямо с серверов RedGifs.
    Автоматически получает рабочий Access Token сессии, обходя 404 ошибки OAuth.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Origin": "https://www.redgifs.com",
        "Referer": "https://www.redgifs.com/"
    }

    async with aiohttp.ClientSession() as session:
        # 1. ПОЛУЧЕНИЕ ТОКЕНА СЕССИИ (Для прохода через Cloudflare и API)
        # Если передан токен модели — используем его, иначе запрашиваем легитимный temporary-токен сайта
        token_to_use = refresh_token.strip() if refresh_token and refresh_token.strip() else None
        
        if not token_to_use:
            try:
                async with session.get(REDGIFS_TEMPORARY_AUTH_URL, headers=headers, timeout=5) as temp_resp:
                    if temp_resp.status == 200:
                        temp_data = await temp_resp.json()
                        token_to_use = temp_data.get("token")
                        print("[🔑 REDGIFS AUTH] Получен рабочий временный токен сессии.")
            except Exception as e:
                print(f"[⚠️ REDGIFS AUTH] Не удалось получить временный токен: {e}")

        # Если токен успешно добыт (свой или временный), подмешиваем в Bearer авторизацию
        if token_to_use:
            headers["Authorization"] = f"Bearer {token_to_use}"

        # 2. ЖИВОЙ ПАРСИНГ ТЕГОВ И НИШ
        try:
            tags_task = session.get(REDGIFS_TAGS_URL, headers=headers, timeout=6)
            niches_task = session.get(REDGIFS_NICHES_URL, headers=headers, timeout=6)
            
            tags_resp, niches_resp = await asyncio.gather(tags_task, niches_task)

            print(f"[DEBUG API] Запрос данных: Tags Status={tags_resp.status}, Niches Status={niches_resp.status}")

            if tags_resp.status != 200:
                raise HTTPException(status_code=tags_resp.status, detail="RedGifs Tags API block.")
            if niches_resp.status != 200:
                raise HTTPException(status_code=niches_resp.status, detail="RedGifs Niches API block.")

            tags_data = await tags_resp.json()
            niches_data = await niches_resp.json()

            # Парсим теги из структуры ответа
            raw_tags = [t["id"] for t in tags_data.get("tags", []) if "id" in t]
            if not raw_tags:
                raw_tags = [t["id"] for t in tags_data.get("topTags", []) if "id" in t]
                
            raw_niches_data = niches_data.get("niches", [])

            niches_list = []
            relations = {}

            # Строим живую карту распределения тегов по категориям
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

            if not raw_tags or not niches_list:
                raise HTTPException(status_code=502, detail="RedGifs returned empty JSON fields.")

            return {
                "tags": list(set(raw_tags))[:50],
                "niches": niches_list,
                "relations": relations
            }

        except HTTPException as http_err:
            raise http_err
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Parser dead: {str(e)}")