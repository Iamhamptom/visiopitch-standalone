"""VisioPitch Standalone — FastAPI server with Supabase."""

import os
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

load_dotenv()

from backend.api.auth import router as auth_router
from backend.api.pitches import router as pitches_router
from backend.ai.llm import check_lm_studio
from backend.middleware.rate_limit import RateLimitMiddleware

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: check engines."""
    ai_status = await check_lm_studio()
    engine = ai_status.get("engine", "none")

    port = os.environ.get("PORT", "8000")
    print(f"✦ VisioPitch server ready — http://localhost:{port}")
    print(f"  AI engine: {engine}")
    print(f"  Database: Supabase")
    print(f"  API docs: http://localhost:{port}/docs")
    yield


app = FastAPI(
    title="VisioPitch",
    description="AI-powered pitch builder",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
ALLOWED_ORIGINS = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,https://visiopitch-standalone.vercel.app"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
app.add_middleware(RateLimitMiddleware)

# Routes
app.include_router(auth_router)
app.include_router(pitches_router)


@app.get("/api/health")
async def health():
    ai_status = await check_lm_studio()
    return {
        "status": "ok",
        "app": "visiopitch",
        "version": "2.0.0",
        "ai_engine": ai_status.get("engine", "none"),
        "database": "supabase",
    }


# Local dev: serve built React frontend (not needed on Vercel)
if os.environ.get("VERCEL") is None and FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}")
    async def serve_spa(path: str):
        index = FRONTEND_DIST / "index.html"
        return HTMLResponse(content=index.read_text())
