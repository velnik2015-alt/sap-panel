from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.models import router as models_router

app = FastAPI(
    title="SAP API",
    version="0.1.0"
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(models_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}