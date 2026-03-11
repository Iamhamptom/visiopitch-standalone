"""Sandbox API routes — cloud preview management."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.db import get_db, Pitch, User
from backend.api.auth import require_user
from backend.sandbox.cloud import (
    create_preview_sandbox,
    update_preview_sandbox,
    destroy_preview_sandbox,
    is_cloud_sandbox_available,
)
from backend.sandbox.renderer import render_pitch_html

router = APIRouter(prefix="/api/sandbox", tags=["sandbox"])


@router.get("/status")
async def sandbox_status():
    """Check if cloud sandbox is available."""
    return {
        "cloud_available": is_cloud_sandbox_available(),
        "local_available": True,  # Local preview always works
    }


@router.post("/{pitch_id}/preview")
async def create_preview(
    pitch_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update a cloud sandbox preview for a pitch."""
    result = await db.execute(
        select(Pitch).where(Pitch.id == pitch_id, Pitch.user_id == user.id)
    )
    pitch = result.scalar_one_or_none()
    if not pitch:
        raise HTTPException(404, "Pitch not found")

    pitch_data = {
        "id": pitch.id,
        "title": pitch.title,
        "accent_color": pitch.accent_color,
        "blocks": pitch.blocks or [],
    }

    if is_cloud_sandbox_available():
        sandbox_result = await create_preview_sandbox(pitch_data)
        return sandbox_result
    else:
        # Fallback: return local preview HTML
        html = render_pitch_html(pitch_data)
        return {
            "mode": "local",
            "html": html,
            "pitch_id": pitch_id,
        }


@router.delete("/{pitch_id}/preview")
async def delete_preview(
    pitch_id: str,
    user: User = Depends(require_user),
):
    """Destroy a cloud sandbox."""
    result = await destroy_preview_sandbox(pitch_id)
    return result
