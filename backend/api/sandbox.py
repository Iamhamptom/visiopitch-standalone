"""Sandbox API routes — cloud preview management (Supabase backend)."""

from fastapi import APIRouter, Depends, HTTPException

from backend.db.supabase import get_supabase
from backend.api.auth import require_user
from backend.sandbox.cloud import (
    create_preview_sandbox,
    destroy_preview_sandbox,
    is_cloud_sandbox_available,
)
from backend.sandbox.renderer import render_pitch_html

router = APIRouter(prefix="/api/sandbox", tags=["sandbox"])


@router.get("/status")
async def sandbox_status():
    return {
        "cloud_available": is_cloud_sandbox_available(),
        "local_available": True,
    }


@router.post("/{pitch_id}/preview")
async def create_preview(pitch_id: str, user: dict = Depends(require_user)):
    sb = get_supabase()
    result = sb.table("vp_pitches").select("*").eq("id", pitch_id).eq("user_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(404, "Pitch not found")

    pitch = result.data[0]
    pitch_data = {
        "id": pitch["id"],
        "title": pitch["title"],
        "accent_color": pitch["accent_color"],
        "blocks": pitch.get("blocks") or [],
    }

    if is_cloud_sandbox_available():
        sandbox_result = await create_preview_sandbox(pitch_data)
        return sandbox_result
    else:
        html = render_pitch_html(pitch_data)
        return {"mode": "local", "html": html, "pitch_id": pitch_id}


@router.delete("/{pitch_id}/preview")
async def delete_preview(pitch_id: str, user: dict = Depends(require_user)):
    result = await destroy_preview_sandbox(pitch_id)
    return result
