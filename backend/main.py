"""VisioPitch Standalone — FastAPI server."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from backend.db.database import init_db
from backend.api.auth import router as auth_router
from backend.api.pitches import router as pitches_router
from backend.sandbox.renderer import render_pitch_html


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: init database."""
    await init_db()
    print("✦ VisioPitch server ready — http://localhost:8000")
    yield


app = FastAPI(
    title="VisioPitch",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth_router)
app.include_router(pitches_router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "visiopitch", "version": "1.0.0"}


@app.post("/api/preview")
async def preview_pitch(pitch: dict):
    """Render a pitch to sandboxed HTML for iframe preview."""
    html = render_pitch_html(pitch)
    return HTMLResponse(content=html)
