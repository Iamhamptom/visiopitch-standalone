"""Pitch CRUD + chat routes."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import json
import uuid

from backend.db import get_db, Pitch, Conversation, User
from backend.api.auth import require_user
from backend.ai.llm import chat_stream, chat_complete, check_lm_studio

router = APIRouter(prefix="/api/pitches", tags=["pitches"])


# ── Schemas ──

class CreatePitchRequest(BaseModel):
    title: str = "Untitled Pitch"
    industry: str = "general"
    client_name: Optional[str] = None
    client_company: Optional[str] = None
    accent_color: str = "#3B82F6"


class UpdatePitchRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    industry: Optional[str] = None
    status: Optional[str] = None
    client_name: Optional[str] = None
    client_company: Optional[str] = None
    accent_color: Optional[str] = None
    blocks: Optional[list] = None
    brand_config: Optional[dict] = None
    facts: Optional[list] = None


class ChatRequest(BaseModel):
    message: str


# ── CRUD ──

@router.get("")
async def list_pitches(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Pitch)
        .where(Pitch.user_id == user.id)
        .order_by(Pitch.updated_at.desc())
    )
    pitches = result.scalars().all()
    return [_serialize_pitch(p) for p in pitches]


@router.post("")
async def create_pitch(
    req: CreatePitchRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    pitch = Pitch(
        user_id=user.id,
        title=req.title,
        industry=req.industry,
        client_name=req.client_name,
        client_company=req.client_company,
        accent_color=req.accent_color,
        blocks=[],
        brand_config={},
        facts=[],
    )
    db.add(pitch)
    await db.commit()
    await db.refresh(pitch)
    return _serialize_pitch(pitch)


@router.get("/{pitch_id}")
async def get_pitch(
    pitch_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    pitch = await _get_user_pitch(pitch_id, user.id, db)
    return _serialize_pitch(pitch)


@router.patch("/{pitch_id}")
async def update_pitch(
    pitch_id: str,
    req: UpdatePitchRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    pitch = await _get_user_pitch(pitch_id, user.id, db)

    for field, value in req.model_dump(exclude_none=True).items():
        setattr(pitch, field, value)

    await db.commit()
    await db.refresh(pitch)
    return _serialize_pitch(pitch)


@router.delete("/{pitch_id}")
async def delete_pitch(
    pitch_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    pitch = await _get_user_pitch(pitch_id, user.id, db)
    await db.delete(pitch)
    await db.commit()
    return {"deleted": True}


# ── Chat ──

@router.post("/{pitch_id}/chat")
async def chat(
    pitch_id: str,
    req: ChatRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    pitch = await _get_user_pitch(pitch_id, user.id, db)

    # Load or create conversation
    conv_result = await db.execute(
        select(Conversation).where(Conversation.pitch_id == pitch_id)
    )
    conv = conv_result.scalar_one_or_none()
    if not conv:
        conv = Conversation(pitch_id=pitch_id, messages=[])
        db.add(conv)
        await db.commit()
        await db.refresh(conv)

    # Add user message
    messages = conv.messages or []
    messages.append({"role": "user", "content": req.message})

    # Build pitch context for the AI
    pitch_context = {
        "title": pitch.title,
        "industry": pitch.industry,
        "client_name": pitch.client_name,
        "client_company": pitch.client_company,
        "accent_color": pitch.accent_color,
        "blocks": pitch.blocks or [],
        "block_count": len(pitch.blocks or []),
    }

    # Get AI response (non-streaming for tool use reliability)
    result = await chat_complete(messages, pitch_context)

    # Process tool calls — apply mutations to pitch
    tool_results = []
    if result.get("tool_calls"):
        for tc in result["tool_calls"]:
            outcome = await _apply_tool_call(tc["name"], tc["arguments"], pitch, db)
            tool_results.append({"tool": tc["name"], "result": outcome})

    # Save assistant message to conversation
    assistant_content = result.get("content") or ""
    if tool_results:
        tool_summary = ", ".join(t["tool"] for t in tool_results)
        if assistant_content:
            assistant_content += f"\n\n[Applied: {tool_summary}]"
        else:
            assistant_content = f"Done! [Applied: {tool_summary}]"

    messages.append({"role": "assistant", "content": assistant_content})
    conv.messages = messages
    await db.commit()

    return {
        "message": assistant_content,
        "tool_results": tool_results,
        "pitch": _serialize_pitch(pitch),
    }


@router.post("/{pitch_id}/chat/stream")
async def chat_streaming(
    pitch_id: str,
    req: ChatRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    pitch = await _get_user_pitch(pitch_id, user.id, db)

    pitch_context = {
        "title": pitch.title,
        "industry": pitch.industry,
        "blocks": pitch.blocks or [],
    }

    messages = [{"role": "user", "content": req.message}]

    return StreamingResponse(
        chat_stream(messages, pitch_context),
        media_type="text/event-stream",
    )


# ── LM Studio status ──

@router.get("/system/status")
async def system_status():
    return await check_lm_studio()


# ── Helpers ──

async def _get_user_pitch(pitch_id: str, user_id: str, db: AsyncSession) -> Pitch:
    result = await db.execute(
        select(Pitch).where(Pitch.id == pitch_id, Pitch.user_id == user_id)
    )
    pitch = result.scalar_one_or_none()
    if not pitch:
        raise HTTPException(404, "Pitch not found")
    return pitch


async def _apply_tool_call(name: str, args: dict, pitch: Pitch, db: AsyncSession) -> str:
    """Apply an AI tool call to mutate the pitch."""
    blocks = list(pitch.blocks or [])

    if name == "generate_pitch":
        pitch.title = args.get("title", pitch.title)
        pitch.industry = args.get("industry", pitch.industry)
        pitch.client_name = args.get("client_name", pitch.client_name)
        pitch.client_company = args.get("client_company", pitch.client_company)
        pitch.accent_color = args.get("accent_color", pitch.accent_color)
        new_blocks = args.get("blocks", [])
        pitch.blocks = [
            {"id": str(uuid.uuid4()), "type": b["type"], "props": b.get("props", {}), "visible": True}
            for b in new_blocks
        ]
        await db.commit()
        return f"Generated pitch with {len(new_blocks)} blocks"

    elif name == "add_block":
        block = {
            "id": str(uuid.uuid4()),
            "type": args["type"],
            "props": args.get("props", {}),
            "visible": True,
        }
        pos = args.get("position", "end")
        if pos == "start":
            blocks.insert(0, block)
        elif pos == "before_cta":
            cta_idx = next((i for i, b in enumerate(blocks) if b.get("type") == "cta"), len(blocks))
            blocks.insert(cta_idx, block)
        else:
            blocks.append(block)
        pitch.blocks = blocks
        await db.commit()
        return f"Added {args['type']} block"

    elif name == "edit_block":
        idx = args.get("block_index", 0)
        if 0 <= idx < len(blocks):
            blocks[idx]["props"] = {**blocks[idx].get("props", {}), **args.get("props", {})}
            pitch.blocks = blocks
            await db.commit()
            return f"Updated block {idx}"
        return "Block index out of range"

    elif name == "remove_block":
        idx = args.get("block_index", 0)
        if 0 <= idx < len(blocks):
            removed = blocks.pop(idx)
            pitch.blocks = blocks
            await db.commit()
            return f"Removed {removed.get('type', 'unknown')} block"
        return "Block index out of range"

    elif name == "update_meta":
        for key in ("title", "accent_color", "client_name", "client_company", "industry"):
            if key in args:
                setattr(pitch, key, args[key])
        await db.commit()
        return "Updated pitch metadata"

    return f"Unknown tool: {name}"


def _serialize_pitch(pitch: Pitch) -> dict:
    return {
        "id": pitch.id,
        "user_id": pitch.user_id,
        "title": pitch.title,
        "description": pitch.description,
        "industry": pitch.industry,
        "status": pitch.status,
        "client_name": pitch.client_name,
        "client_company": pitch.client_company,
        "accent_color": pitch.accent_color,
        "blocks": pitch.blocks or [],
        "brand_config": pitch.brand_config or {},
        "facts": pitch.facts or [],
        "created_at": pitch.created_at.isoformat() if pitch.created_at else None,
        "updated_at": pitch.updated_at.isoformat() if pitch.updated_at else None,
    }
