"""Pitch CRUD + chat routes (Supabase backend)."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
import uuid

from backend.db.supabase import get_supabase
from backend.api.auth import require_user
from backend.ai.llm import chat_complete, check_lm_studio

router = APIRouter(prefix="/api/pitches", tags=["pitches"])


# ── Schemas ──

class CreatePitchRequest(BaseModel):
    title: str = "Untitled Pitch"
    industry: str = "general"
    client_name: Optional[str] = None
    client_company: Optional[str] = None
    accent_color: str = "#6366F1"


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
async def list_pitches(user: dict = Depends(require_user)):
    sb = get_supabase()
    result = sb.table("vp_pitches") \
        .select("*") \
        .eq("user_id", user["id"]) \
        .order("updated_at", desc=True) \
        .execute()
    return result.data


@router.post("")
async def create_pitch(req: CreatePitchRequest, user: dict = Depends(require_user)):
    sb = get_supabase()
    data = {
        "user_id": user["id"],
        "title": req.title,
        "industry": req.industry,
        "client_name": req.client_name,
        "client_company": req.client_company,
        "accent_color": req.accent_color,
        "blocks": [],
        "brand_config": {},
        "facts": [],
    }
    result = sb.table("vp_pitches").insert(data).execute()
    return result.data[0]


@router.get("/{pitch_id}")
async def get_pitch(pitch_id: str, user: dict = Depends(require_user)):
    pitch = _get_user_pitch(pitch_id, user["id"])
    return pitch


@router.patch("/{pitch_id}")
async def update_pitch(pitch_id: str, req: UpdatePitchRequest, user: dict = Depends(require_user)):
    _get_user_pitch(pitch_id, user["id"])  # verify ownership

    update_data = req.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(400, "No fields to update")

    sb = get_supabase()
    result = sb.table("vp_pitches").update(update_data).eq("id", pitch_id).execute()
    return result.data[0]


@router.delete("/{pitch_id}")
async def delete_pitch(pitch_id: str, user: dict = Depends(require_user)):
    _get_user_pitch(pitch_id, user["id"])  # verify ownership

    sb = get_supabase()
    sb.table("vp_pitches").delete().eq("id", pitch_id).execute()
    return {"deleted": True}


# ── Chat ──

@router.post("/{pitch_id}/chat")
async def chat(pitch_id: str, req: ChatRequest, user: dict = Depends(require_user)):
    pitch = _get_user_pitch(pitch_id, user["id"])
    sb = get_supabase()

    # Load or create conversation
    conv_result = sb.table("vp_conversations").select("*").eq("pitch_id", pitch_id).execute()
    if conv_result.data:
        conv = conv_result.data[0]
    else:
        conv_insert = sb.table("vp_conversations").insert({"pitch_id": pitch_id, "messages": []}).execute()
        conv = conv_insert.data[0]

    # Add user message
    messages = conv.get("messages") or []
    messages.append({"role": "user", "content": req.message})

    # Build pitch context
    pitch_context = {
        "title": pitch["title"],
        "industry": pitch["industry"],
        "client_name": pitch.get("client_name"),
        "client_company": pitch.get("client_company"),
        "accent_color": pitch["accent_color"],
        "blocks": pitch.get("blocks") or [],
        "block_count": len(pitch.get("blocks") or []),
    }

    # Get AI response
    result = await chat_complete(messages, pitch_context)

    # Process tool calls
    tool_results = []
    if result.get("tool_calls"):
        for tc in result["tool_calls"]:
            outcome = _apply_tool_call(tc["name"], tc["arguments"], pitch, sb, pitch_id)
            tool_results.append({"tool": tc["name"], "result": outcome})
        # Reload pitch after mutations
        pitch = _get_user_pitch(pitch_id, user["id"])

    # Build assistant message
    assistant_content = result.get("content") or ""
    if tool_results:
        tool_summary = ", ".join(t["tool"] for t in tool_results)
        if assistant_content:
            assistant_content += f"\n\n[Applied: {tool_summary}]"
        else:
            assistant_content = f"Done! [Applied: {tool_summary}]"

    messages.append({"role": "assistant", "content": assistant_content})
    sb.table("vp_conversations").update({"messages": messages}).eq("id", conv["id"]).execute()

    return {
        "message": assistant_content,
        "tool_results": tool_results,
        "pitch": pitch,
    }


# ── LM Studio status ──

@router.get("/system/status")
async def system_status():
    return await check_lm_studio()


# ── Helpers ──

def _get_user_pitch(pitch_id: str, user_id: str) -> dict:
    sb = get_supabase()
    result = sb.table("vp_pitches").select("*").eq("id", pitch_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(404, "Pitch not found")
    return result.data[0]


def _apply_tool_call(name: str, args: dict, pitch: dict, sb, pitch_id: str) -> str:
    """Apply an AI tool call to mutate the pitch in Supabase."""
    blocks = list(pitch.get("blocks") or [])

    if name == "generate_pitch":
        update = {}
        if "title" in args:
            update["title"] = args["title"]
        if "industry" in args:
            update["industry"] = args["industry"]
        if "client_name" in args:
            update["client_name"] = args["client_name"]
        if "client_company" in args:
            update["client_company"] = args["client_company"]
        if "accent_color" in args:
            update["accent_color"] = args["accent_color"]

        new_blocks = args.get("blocks", [])
        update["blocks"] = [
            {"id": str(uuid.uuid4()), "type": b["type"], "props": b.get("props", {}), "visible": True}
            for b in new_blocks
        ]
        sb.table("vp_pitches").update(update).eq("id", pitch_id).execute()
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
        sb.table("vp_pitches").update({"blocks": blocks}).eq("id", pitch_id).execute()
        return f"Added {args['type']} block"

    elif name == "edit_block":
        idx = args.get("block_index", 0)
        if 0 <= idx < len(blocks):
            blocks[idx]["props"] = {**blocks[idx].get("props", {}), **args.get("props", {})}
            sb.table("vp_pitches").update({"blocks": blocks}).eq("id", pitch_id).execute()
            return f"Updated block {idx}"
        return "Block index out of range"

    elif name == "remove_block":
        idx = args.get("block_index", 0)
        if 0 <= idx < len(blocks):
            removed = blocks.pop(idx)
            sb.table("vp_pitches").update({"blocks": blocks}).eq("id", pitch_id).execute()
            return f"Removed {removed.get('type', 'unknown')} block"
        return "Block index out of range"

    elif name == "update_meta":
        update = {}
        for key in ("title", "accent_color", "client_name", "client_company", "industry"):
            if key in args:
                update[key] = args[key]
        if update:
            sb.table("vp_pitches").update(update).eq("id", pitch_id).execute()
        return "Updated pitch metadata"

    return f"Unknown tool: {name}"
