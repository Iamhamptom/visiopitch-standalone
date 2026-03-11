"""VisioPitch Standalone — FastAPI server with cloud sandbox."""

import os
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

load_dotenv()

from backend.db.database import init_db
from backend.api.auth import router as auth_router
from backend.api.pitches import router as pitches_router
from backend.api.sandbox import router as sandbox_router
from backend.sandbox.renderer import render_pitch_html
from backend.sandbox.cloud import is_cloud_sandbox_available
from backend.ai.llm import check_lm_studio

# Resolve frontend build directory
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: init database, check engines."""
    await init_db()

    # Check AI engines
    ai_status = await check_lm_studio()
    engine = ai_status.get("engine", "none")
    cloud_sandbox = "enabled" if is_cloud_sandbox_available() else "local only"

    port = os.environ.get("PORT", "8000")
    print(f"✦ VisioPitch server ready — http://localhost:{port}")
    print(f"  AI engine: {engine}")
    print(f"  Sandbox: {cloud_sandbox}")
    print(f"  API docs: http://localhost:{port}/docs")
    yield


app = FastAPI(
    title="VisioPitch",
    description="AI-powered pitch builder with cloud sandbox",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Vite dev server + any deployed frontend
ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth_router)
app.include_router(pitches_router)
app.include_router(sandbox_router)


@app.get("/api/health")
async def health():
    ai_status = await check_lm_studio()
    return {
        "status": "ok",
        "app": "visiopitch",
        "version": "1.0.0",
        "ai_engine": ai_status.get("engine", "none"),
        "cloud_sandbox": is_cloud_sandbox_available(),
    }


@app.post("/api/preview")
async def preview_pitch(pitch: dict):
    """Render a pitch to sandboxed HTML for iframe preview."""
    html = render_pitch_html(pitch)
    return HTMLResponse(content=html)


# In production, serve the built React frontend
if FRONTEND_DIST.exists():
    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}")
    async def serve_spa(path: str):
        """Serve React SPA — all non-API routes return index.html."""
        index = FRONTEND_DIST / "index.html"
        return HTMLResponse(content=index.read_text())
else:
    @app.get("/")
    async def root():
        return {"message": "VisioPitch API", "docs": "/docs"}
