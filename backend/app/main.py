import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.database import init_db
import app.models.knowledge  # noqa: F401 — 테이블 생성을 위해 import
import app.models.user  # noqa: F401
from app.routers import summarize, summaries, export, knowledge, auth

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="YTSummarizer API", lifespan=lifespan)

# CORS: 로컬 + 프로덕션 도메인 허용
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)
    # www 서브도메인 및 trailing slash 변형도 허용
    if frontend_url.startswith("https://") and not frontend_url.startswith("https://www."):
        allowed_origins.append(frontend_url.replace("https://", "https://www."))
    allowed_origins.append(frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(summarize.router)
app.include_router(summaries.router)
app.include_router(export.router)
app.include_router(knowledge.router)
app.include_router(auth.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
