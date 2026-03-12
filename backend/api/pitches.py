"""Pitch CRUD + chat routes (Supabase backend).

Lovable-style: AI generates freeform HTML, stored as html_content on pitch.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import json
import re
import uuid
import base64
import secrets
from datetime import datetime, timedelta, timezone

from backend.db.supabase import get_supabase
from backend.api.auth import require_user
from backend.ai.llm import chat_complete, chat_complete_stream, check_lm_studio, generate_image


def _sanitize_html(html: str) -> str:
    """Strip dangerous patterns from AI-generated HTML."""
    html = re.sub(r'<script\b[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'\bon\w+\s*=\s*["\'][^"\']*["\']', '', html, flags=re.IGNORECASE)
    html = re.sub(r'javascript\s*:', '', html, flags=re.IGNORECASE)
    return html


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
    html_content: Optional[str] = None
    brand_config: Optional[dict] = None
    facts: Optional[list] = None


class ChatRequest(BaseModel):
    message: str


# ── CRUD ──

@router.get("")
async def list_pitches(user: dict = Depends(require_user)):
    sb = get_supabase()
    result = sb.table("vp_pitches") \
        .select("id,title,description,industry,status,client_name,client_company,accent_color,blocks,created_at,updated_at") \
        .eq("user_id", user["id"]) \
        .order("updated_at", desc=True) \
        .execute()
    # Add html indicator without sending full html_content in list
    for p in result.data:
        p["has_html"] = False
    # Check which ones have html_content
    html_check = sb.table("vp_pitches") \
        .select("id,html_content") \
        .eq("user_id", user["id"]) \
        .not_.is_("html_content", "null") \
        .execute()
    html_ids = {r["id"] for r in html_check.data}
    for p in result.data:
        p["has_html"] = p["id"] in html_ids
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
        "html_content": None,
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

    # Build pitch context — include current HTML for editing
    pitch_context = {
        "title": pitch["title"],
        "industry": pitch["industry"],
        "client_name": pitch.get("client_name"),
        "client_company": pitch.get("client_company"),
        "accent_color": pitch["accent_color"],
        "html_content": pitch.get("html_content") or "",
    }

    # Get AI response
    result = await chat_complete(messages, pitch_context)

    # Process tool calls
    tool_results = []
    if result.get("tool_calls"):
        for tc in result["tool_calls"]:
            if tc["name"] == "generate_image":
                # Handle image generation inline
                img_result = await generate_image(
                    tc["arguments"].get("prompt", ""),
                    tc["arguments"].get("style", "abstract"),
                )
                if img_result.get("base64"):
                    import base64 as b64
                    image_data = b64.b64decode(img_result["base64"])
                    storage_path = f"{pitch_id}/{uuid.uuid4().hex}.png"
                    sb.storage.from_("pitch-images").upload(
                        storage_path, image_data, {"content-type": "image/png"},
                    )
                    public_url = sb.storage.from_("pitch-images").get_public_url(storage_path)
                    tool_results.append({"tool": "generate_image", "result": f"Image ready: {public_url}"})
                else:
                    tool_results.append({"tool": "generate_image", "result": f"Failed: {img_result.get('error', 'unknown')}"})
            else:
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


# ── Streaming Chat ──

@router.post("/{pitch_id}/chat/stream")
async def chat_stream(pitch_id: str, req: ChatRequest, user: dict = Depends(require_user)):
    """Stream AI response as SSE events."""
    pitch = _get_user_pitch(pitch_id, user["id"])
    sb = get_supabase()

    # Load or create conversation
    conv_result = sb.table("vp_conversations").select("*").eq("pitch_id", pitch_id).execute()
    if conv_result.data:
        conv = conv_result.data[0]
    else:
        conv_insert = sb.table("vp_conversations").insert({"pitch_id": pitch_id, "messages": []}).execute()
        conv = conv_insert.data[0]

    messages = conv.get("messages") or []
    messages.append({"role": "user", "content": req.message})

    pitch_context = {
        "title": pitch["title"],
        "industry": pitch["industry"],
        "client_name": pitch.get("client_name"),
        "client_company": pitch.get("client_company"),
        "accent_color": pitch["accent_color"],
        "html_content": pitch.get("html_content") or "",
    }

    async def event_generator():
        full_text = ""
        tool_calls = []

        async for event in chat_complete_stream(messages, pitch_context):
            event_type = event.get("type")

            if event_type == "text":
                full_text += event["content"]
                yield f"data: {json.dumps(event)}\n\n"

            elif event_type == "tool_call":
                tool_calls.append({"name": event["name"], "arguments": event["arguments"]})
                yield f"data: {json.dumps(event)}\n\n"

            elif event_type == "done":
                # Process tool calls
                tool_results = []
                for tc in tool_calls:
                    outcome = _apply_tool_call(tc["name"], tc["arguments"], pitch, sb, pitch_id)
                    tool_results.append({"tool": tc["name"], "result": outcome})

                # If no tool calls but HTML in text, extract it
                if not tool_calls and full_text:
                    from backend.ai.llm import _extract_html_from_text
                    result = _extract_html_from_text({"content": full_text, "tool_calls": []})
                    for tc in result["tool_calls"]:
                        outcome = _apply_tool_call(tc["name"], tc["arguments"], pitch, sb, pitch_id)
                        tool_results.append({"tool": tc["name"], "result": outcome})
                    full_text = result["content"]

                # Save conversation
                assistant_content = full_text
                if tool_results:
                    tool_summary = ", ".join(t["tool"] for t in tool_results)
                    if assistant_content:
                        assistant_content += f"\n\n[Applied: {tool_summary}]"
                    else:
                        assistant_content = f"Done! [Applied: {tool_summary}]"

                messages.append({"role": "assistant", "content": assistant_content})
                sb.table("vp_conversations").update({"messages": messages}).eq("id", conv["id"]).execute()

                # Reload pitch for final state
                updated_pitch = _get_user_pitch(pitch_id, user["id"])

                yield f"data: {json.dumps({'type': 'complete', 'message': assistant_content, 'tool_results': tool_results, 'pitch': updated_pitch})}\n\n"

            elif event_type == "error":
                yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Public view ──

@router.get("/{pitch_id}/public")
async def get_public_pitch(pitch_id: str):
    """Get pitch for public viewing (no auth required)."""
    sb = get_supabase()
    result = sb.table("vp_pitches").select("*").eq("id", pitch_id).execute()
    if not result.data:
        raise HTTPException(404, "Pitch not found")
    pitch = result.data[0]
    # Strip sensitive fields
    pitch.pop("user_id", None)
    return pitch


# ── Version History ──

@router.get("/{pitch_id}/versions")
async def list_versions(pitch_id: str, user: dict = Depends(require_user)):
    _get_user_pitch(pitch_id, user["id"])
    sb = get_supabase()
    result = sb.table("vp_pitch_versions") \
        .select("id,pitch_id,version_number,message,created_at") \
        .eq("pitch_id", pitch_id) \
        .order("version_number", desc=True) \
        .limit(50).execute()
    return result.data


@router.get("/{pitch_id}/versions/{version_id}")
async def get_version(pitch_id: str, version_id: str, user: dict = Depends(require_user)):
    _get_user_pitch(pitch_id, user["id"])
    sb = get_supabase()
    result = sb.table("vp_pitch_versions") \
        .select("*") \
        .eq("id", version_id) \
        .eq("pitch_id", pitch_id) \
        .execute()
    if not result.data:
        raise HTTPException(404, "Version not found")
    return result.data[0]


@router.post("/{pitch_id}/versions/{version_id}/restore")
async def restore_version(pitch_id: str, version_id: str, user: dict = Depends(require_user)):
    _get_user_pitch(pitch_id, user["id"])
    sb = get_supabase()
    version = sb.table("vp_pitch_versions") \
        .select("*") \
        .eq("id", version_id) \
        .eq("pitch_id", pitch_id) \
        .execute()
    if not version.data:
        raise HTTPException(404, "Version not found")

    html = version.data[0]["html_content"]
    sb.table("vp_pitches").update({"html_content": html}).eq("id", pitch_id).execute()
    _save_version(sb, pitch_id, html, f"Restored to v{version.data[0]['version_number']}")

    pitch = _get_user_pitch(pitch_id, user["id"])
    return pitch


# ── Share Links ──

class CreateShareRequest(BaseModel):
    password: Optional[str] = None
    expires_hours: Optional[int] = None
    allow_download: bool = False


@router.post("/{pitch_id}/share")
async def create_share(pitch_id: str, req: CreateShareRequest, user: dict = Depends(require_user)):
    _get_user_pitch(pitch_id, user["id"])
    sb = get_supabase()

    token = secrets.token_urlsafe(16)
    data = {
        "pitch_id": pitch_id,
        "token": token,
        "allow_download": req.allow_download,
        "is_active": True,
        "created_by": user["id"],
    }
    if req.password:
        import bcrypt
        data["password_hash"] = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    if req.expires_hours:
        data["expires_at"] = (datetime.now(timezone.utc) + timedelta(hours=req.expires_hours)).isoformat()

    result = sb.table("vp_pitch_shares").insert(data).execute()
    return {"share": result.data[0], "url": f"/s/{token}"}


@router.get("/{pitch_id}/shares")
async def list_shares(pitch_id: str, user: dict = Depends(require_user)):
    _get_user_pitch(pitch_id, user["id"])
    sb = get_supabase()
    result = sb.table("vp_pitch_shares") \
        .select("*") \
        .eq("pitch_id", pitch_id) \
        .order("created_at", desc=True).execute()
    return result.data


@router.delete("/{pitch_id}/shares/{share_id}")
async def delete_share(pitch_id: str, share_id: str, user: dict = Depends(require_user)):
    _get_user_pitch(pitch_id, user["id"])
    sb = get_supabase()
    sb.table("vp_pitch_shares").delete().eq("id", share_id).execute()
    return {"deleted": True}


# ── Public Share View ──

@router.get("/s/{token}")
async def view_shared_pitch(token: str):
    """View a pitch via share link (no auth)."""
    sb = get_supabase()
    share = sb.table("vp_pitch_shares").select("*").eq("token", token).execute()
    if not share.data:
        raise HTTPException(404, "Share link not found")

    share_data = share.data[0]

    # Check expiry
    if share_data.get("expires_at"):
        expires = datetime.fromisoformat(share_data["expires_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(410, "Share link has expired")

    # Get pitch
    pitch = sb.table("vp_pitches").select("*").eq("id", share_data["pitch_id"]).execute()
    if not pitch.data:
        raise HTTPException(404, "Pitch not found")

    pitch_data = pitch.data[0]
    pitch_data.pop("user_id", None)
    pitch_data["allow_download"] = share_data.get("allow_download", False)

    return pitch_data


# ── View Analytics ──

class RecordViewRequest(BaseModel):
    share_token: Optional[str] = None
    duration_seconds: Optional[int] = None
    scroll_depth: Optional[float] = None


@router.post("/{pitch_id}/views")
async def record_view(pitch_id: str, req: RecordViewRequest, request: Request):
    """Record a pitch view (no auth — called from public viewer)."""
    sb = get_supabase()

    # Verify pitch exists
    pitch = sb.table("vp_pitches").select("id").eq("id", pitch_id).execute()
    if not pitch.data:
        raise HTTPException(404, "Pitch not found")

    data = {
        "pitch_id": pitch_id,
        "ip_address": request.client.host if request.client else "unknown",
        "user_agent": request.headers.get("user-agent", "")[:500],
        "duration_seconds": req.duration_seconds or 0,
        "scroll_depth": min(max(req.scroll_depth or 0, 0.0), 1.0),
    }

    if req.share_token:
        share = sb.table("vp_pitch_shares").select("id").eq("token", req.share_token).execute()
        if share.data:
            data["share_id"] = share.data[0]["id"]

    sb.table("vp_pitch_views").insert(data).execute()
    return {"recorded": True}


@router.get("/{pitch_id}/analytics")
async def get_analytics(pitch_id: str, user: dict = Depends(require_user)):
    _get_user_pitch(pitch_id, user["id"])
    sb = get_supabase()

    views = sb.table("vp_pitch_views") \
        .select("*") \
        .eq("pitch_id", pitch_id) \
        .order("viewed_at", desc=True) \
        .limit(500).execute()

    total_views = len(views.data)
    unique_ips = len(set(v.get("ip_address", "") for v in views.data))
    durations = [v.get("duration_seconds", 0) for v in views.data if v.get("duration_seconds")]
    avg_duration = sum(durations) / len(durations) if durations else 0
    depths = [v.get("scroll_depth", 0) for v in views.data if v.get("scroll_depth")]
    avg_depth = sum(depths) / len(depths) if depths else 0

    return {
        "total_views": total_views,
        "unique_viewers": unique_ips,
        "avg_duration_seconds": round(avg_duration),
        "avg_scroll_depth": round(avg_depth, 2),
        "recent_views": views.data[:20],
    }


# ── Image Upload ──

@router.post("/{pitch_id}/upload")
async def upload_image(pitch_id: str, file: UploadFile = File(...), user: dict = Depends(require_user)):
    _get_user_pitch(pitch_id, user["id"])

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files allowed")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10MB)")

    sb = get_supabase()
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "png"
    storage_path = f"{pitch_id}/{uuid.uuid4().hex}.{ext}"

    sb.storage.from_("pitch-images").upload(
        storage_path,
        content,
        {"content-type": file.content_type},
    )

    public_url = sb.storage.from_("pitch-images").get_public_url(storage_path)

    sb.table("vp_assets").insert({
        "pitch_id": pitch_id,
        "user_id": user["id"],
        "filename": file.filename or "upload.png",
        "storage_path": storage_path,
        "public_url": public_url,
        "file_type": file.content_type,
        "file_size": len(content),
    }).execute()

    return {"url": public_url, "path": storage_path}


# ── AI Image Generation ──

@router.post("/{pitch_id}/generate-image")
async def generate_pitch_image(pitch_id: str, req: dict, user: dict = Depends(require_user)):
    """Generate an AI image and store it."""
    _get_user_pitch(pitch_id, user["id"])

    prompt = req.get("prompt", "")
    style = req.get("style", "abstract")
    if not prompt:
        raise HTTPException(400, "Image prompt required")

    result = await generate_image(prompt, style)
    if result.get("error"):
        raise HTTPException(500, result["error"])

    # Upload base64 image to Supabase Storage
    sb = get_supabase()
    image_data = base64.b64decode(result["base64"])
    storage_path = f"{pitch_id}/{uuid.uuid4().hex}.png"

    sb.storage.from_("pitch-images").upload(
        storage_path,
        image_data,
        {"content-type": "image/png"},
    )

    public_url = sb.storage.from_("pitch-images").get_public_url(storage_path)

    sb.table("vp_assets").insert({
        "pitch_id": pitch_id,
        "user_id": user["id"],
        "filename": f"ai-{style}-{uuid.uuid4().hex[:8]}.png",
        "storage_path": storage_path,
        "public_url": public_url,
        "file_type": "image/png",
        "file_size": len(image_data),
    }).execute()

    return {"url": public_url}


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


def _save_version(sb, pitch_id: str, html: str, message: str = "AI update"):
    """Save a version snapshot of the pitch HTML."""
    # Get current version count
    versions = sb.table("vp_pitch_versions").select("version_number") \
        .eq("pitch_id", pitch_id) \
        .order("version_number", desc=True) \
        .limit(1).execute()

    next_version = (versions.data[0]["version_number"] + 1) if versions.data else 1

    sb.table("vp_pitch_versions").insert({
        "pitch_id": pitch_id,
        "version_number": next_version,
        "html_content": html,
        "message": message,
    }).execute()

    # Keep only last 50 versions per pitch
    if next_version > 50:
        old = sb.table("vp_pitch_versions").select("id") \
            .eq("pitch_id", pitch_id) \
            .order("version_number", desc=False) \
            .limit(next_version - 50).execute()
        for v in old.data:
            sb.table("vp_pitch_versions").delete().eq("id", v["id"]).execute()


def _apply_tool_call(name: str, args: dict, pitch: dict, sb, pitch_id: str) -> str:
    """Apply an AI tool call to mutate the pitch in Supabase."""

    if name == "set_html":
        # Core Lovable-style tool: set complete HTML content
        update = {}
        html = _sanitize_html(args.get("html", ""))
        update["html_content"] = html

        # Also update metadata if provided
        for key in ("title", "accent_color", "client_name", "client_company", "industry"):
            if key in args and args[key]:
                update[key] = args[key]

        sb.table("vp_pitches").update(update).eq("id", pitch_id).execute()

        # Auto-save version
        title_hint = args.get("title", pitch.get("title", ""))
        _save_version(sb, pitch_id, html, f"Updated: {title_hint}" if title_hint else "AI update")

        html_size = len(html)
        return f"Set HTML content ({html_size:,} bytes)"

    elif name == "generate_image":
        # This is handled async in the chat endpoint — return placeholder
        return "image_generation_requested"

    elif name == "update_meta":
        update = {}
        for key in ("title", "accent_color", "client_name", "client_company", "industry"):
            if key in args and args[key]:
                update[key] = args[key]
        if update:
            sb.table("vp_pitches").update(update).eq("id", pitch_id).execute()
        return "Updated pitch metadata"

    # Legacy block tools — keep for backward compatibility with existing pitches
    elif name == "generate_pitch":
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
        blocks = list(pitch.get("blocks") or [])
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
        blocks = list(pitch.get("blocks") or [])
        idx = args.get("block_index", 0)
        if 0 <= idx < len(blocks):
            blocks[idx]["props"] = {**blocks[idx].get("props", {}), **args.get("props", {})}
            sb.table("vp_pitches").update({"blocks": blocks}).eq("id", pitch_id).execute()
            return f"Updated block {idx}"
        return "Block index out of range"

    elif name == "remove_block":
        blocks = list(pitch.get("blocks") or [])
        idx = args.get("block_index", 0)
        if 0 <= idx < len(blocks):
            removed = blocks.pop(idx)
            sb.table("vp_pitches").update({"blocks": blocks}).eq("id", pitch_id).execute()
            return f"Removed {removed.get('type', 'unknown')} block"
        return "Block index out of range"

    return f"Unknown tool: {name}"
