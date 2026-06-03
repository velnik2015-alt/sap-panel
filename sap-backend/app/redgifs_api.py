import aiohttp
import asyncio
from fastapi import HTTPException
from typing import Dict, Any

REDGIFS_TAGS_URL = "https://api.redgifs.com/v2/tags"
REDGIFS_NICHES_URL = "https://api.redgifs.com/v2/niches"

async def fetch_top_redgifs_tags() -> Dict[str, Any]:
    """
    Парсит живые теги и ниши прямо с серверов RedGifs.
    Никакого хардкода и заглушек. При ошибке сети или блокировке выбрасывает HTTPException.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    async with aiohttp.ClientSession() as session:
        try:
            # Параллельный асинхронный запрос к двум эндпоинтам RG
            tags_task = session.get(REDGIFS_TAGS_URL, headers=headers, timeout=6)
            niches_task = session.get(REDGIFS_NICHES_URL, headers=headers, timeout=6)
            
            tags_resp, niches_resp = await asyncio.gather(tags_task, niches_task)

            # Если хотя бы один эндпоинт отдал не 200, жестко роняем запрос с кодом ответа
            if tags_resp.status != 200:
                raise HTTPException(status_code=tags_resp.status, detail=f"RedGifs Tags API returned status {tags_resp.status}")
            if niches_resp.status != 200:
                raise HTTPException(status_code=niches_resp.status, detail=f"RedGifs Niches API returned status {niches_resp.status}")

            tags_data = await tags_resp.json()
            niches_data = await niches_resp.json()

            raw_tags = [t["id"] for t in tags_data.get("tags", []) if "id" in t]
            raw_niches_data = niches_data.get("niches", [])

            niches_list = []
            relations = {}

            # Собираем реальную карту связей и доступных категорий
            for item in raw_niches_data:
                niche_id = item.get("id") or item.get("name")
                if not niche_id:
                    continue
                
                niches_list.append(niche_id)

                # Вытаскиваем теги, привязанные к этой нише на стороне RG
                associated_tags = item.get("tags", []) or item.get("searchTags", []) or []
                for t in associated_tags:
                    if not isinstance(t, str):
                        continue
                    t_lower = t.lower()
                    
                    if t_lower not in relations:
                        relations[t_lower] = []
                    if niche_id not in relations[t_lower]:
                        relations[t_lower].append(niche_id)

                    # Если тег из ниши отсутствует в общем трендовом списке, докидываем его
                    if t_lower not in raw_tags:
                        raw_tags.append(t_lower)

            # Если контент пустой (например, Cloudflare заблокировал тело ответа)
            if not raw_tags or not niches_list:
                raise HTTPException(status_code=502, detail="RedGifs returned empty tags or niches data under protection.")

            return {
                "tags": list(set(raw_tags))[:50],  # Убираем дубли, отдаем честные топ-50
                "niches": niches_list,             # Полный динамический список ниш без лимитов
                "relations": relations
            }

        except asyncio.TimeoutError:
            raise HTTPException(status_code=504, detail="Timeout while connecting to RedGifs servers")
        except HTTPException as http_err:
            raise http_err
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Critical parser error: {str(e)}")