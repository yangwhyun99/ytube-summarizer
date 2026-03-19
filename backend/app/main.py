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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
