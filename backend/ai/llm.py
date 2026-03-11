"""Dual-mode LLM — LM Studio (local) with Claude (cloud) fallback."""

import os
import json
from typing import AsyncGenerator
from openai import AsyncOpenAI
import anthropic

# ── Clients ──

# LM Studio: local inference on localhost:1234
lm_client = AsyncOpenAI(
    base_url="http://localhost:1234/v1",
    api_key="lm-studio",
)

# Claude: cloud fallback when LM Studio is offline
claude_client = anthropic.AsyncAnthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY", ""),
)

CLOUD_MODEL = "claude-sonnet-4-20250514"

# ── System prompt ──

SYSTEM_PROMPT = """You are VisioPitch AI — a pitch deck builder assistant.

You help users create compelling, professional pitch decks by:
1. Generating pitch content from prompts (titles, copy, structure)
2. Suggesting improvements to existing blocks
3. Adapting tone and style to the target industry
4. Writing persuasive copy for proposals

When the user asks to create or modify a pitch, respond with a JSON tool call.
Always respond conversationally and explain what you're doing.
Keep responses concise. Focus on action over explanation.

IMPORTANT: When generating blocks, use these types: hero, story, timeline, deliverables, proof, gallery, budget, team, terms, footer, cta, text.
Each block needs: {"type": "...", "props": {...}}

For generate_pitch, return the full pitch as a JSON tool call with this structure:
{"name": "generate_pitch", "arguments": {"title": "...", "industry": "...", "accent_color": "#...", "blocks": [...]}}"""


# ── OpenAI-format tools (for LM Studio) ──

OPENAI_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "generate_pitch",
            "description": "Generate a complete pitch from scratch",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "industry": {"type": "string"},
                    "client_name": {"type": "string"},
                    "client_company": {"type": "string"},
                    "accent_color": {"type": "string"},
                    "blocks": {"type": "array", "items": {"type": "object", "properties": {"type": {"type": "string"}, "props": {"type": "object"}}}},
                },
                "required": ["title", "blocks"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "edit_block",
            "description": "Edit a specific block's content",
            "parameters": {
                "type": "object",
                "properties": {
                    "block_index": {"type": "integer"},
                    "props": {"type": "object"},
                },
                "required": ["block_index", "props"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_block",
            "description": "Add a new block to the pitch",
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "enum": ["hero", "story", "timeline", "deliverables", "proof", "gallery", "budget", "team", "terms", "footer", "cta", "text"]},
                    "props": {"type": "object"},
                    "position": {"type": "string", "enum": ["start", "end", "before_cta"]},
                },
                "required": ["type", "props"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "remove_block",
            "description": "Remove a block by index",
            "parameters": {"type": "object", "properties": {"block_index": {"type": "integer"}}, "required": ["block_index"]},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_meta",
            "description": "Update pitch metadata",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "accent_color": {"type": "string"},
                    "client_name": {"type": "string"},
                    "client_company": {"type": "string"},
                    "industry": {"type": "string"},
                },
            },
        },
    },
]


# ── Claude-format tools ──

CLAUDE_TOOLS = [
    {
        "name": "generate_pitch",
        "description": "Generate a complete pitch from scratch with title, industry, accent color, and blocks array",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "industry": {"type": "string"},
                "client_name": {"type": "string"},
                "client_company": {"type": "string"},
                "accent_color": {"type": "string"},
                "blocks": {"type": "array", "items": {"type": "object", "properties": {"type": {"type": "string"}, "props": {"type": "object"}}}},
            },
            "required": ["title", "blocks"],
        },
    },
    {
        "name": "edit_block",
        "description": "Edit a specific block's content by index",
        "input_schema": {
            "type": "object",
            "properties": {"block_index": {"type": "integer"}, "props": {"type": "object"}},
            "required": ["block_index", "props"],
        },
    },
    {
        "name": "add_block",
        "description": "Add a new block to the pitch",
        "input_schema": {
            "type": "object",
            "properties": {
                "type": {"type": "string", "enum": ["hero", "story", "timeline", "deliverables", "proof", "gallery", "budget", "team", "terms", "footer", "cta", "text"]},
                "props": {"type": "object"},
                "position": {"type": "string", "enum": ["start", "end", "before_cta"]},
            },
            "required": ["type", "props"],
        },
    },
    {
        "name": "remove_block",
        "description": "Remove a block by index",
        "input_schema": {"type": "object", "properties": {"block_index": {"type": "integer"}}, "required": ["block_index"]},
    },
    {
        "name": "update_meta",
        "description": "Update pitch metadata (title, color, client, industry)",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "accent_color": {"type": "string"},
                "client_name": {"type": "string"},
                "client_company": {"type": "string"},
                "industry": {"type": "string"},
            },
        },
    },
]


# ── Engine detection ──

async def _is_lm_studio_online() -> bool:
    try:
        await lm_client.models.list()
        return True
    except Exception:
        return False


async def check_lm_studio() -> dict:
    """Check LM Studio and Claude status."""
    lm_online = await _is_lm_studio_online()
    claude_available = bool(os.environ.get("ANTHROPIC_API_KEY"))

    engine = "lm_studio" if lm_online else ("claude" if claude_available else "none")

    return {
        "status": "online" if engine != "none" else "offline",
        "engine": engine,
        "lm_studio": "online" if lm_online else "offline",
        "claude": "available" if claude_available else "no_api_key",
    }


# ── Chat completion (auto-selects engine) ──

async def chat_complete(
    messages: list[dict],
    pitch_context: dict | None = None,
) -> dict:
    """Complete chat — tries LM Studio first, falls back to Claude."""

    system_content = SYSTEM_PROMPT
    if pitch_context:
        system_content += f"\n\nCurrent pitch state:\n```json\n{json.dumps(pitch_context, indent=2)}\n```"

    # Try LM Studio first
    if await _is_lm_studio_online():
        return await _chat_openai(messages, system_content)

    # Fallback to Claude
    if os.environ.get("ANTHROPIC_API_KEY"):
        return await _chat_claude(messages, system_content)

    return {"content": "No AI engine available. Start LM Studio or set ANTHROPIC_API_KEY.", "tool_calls": [], "engine": "none"}


async def _chat_openai(messages: list[dict], system_content: str) -> dict:
    """Chat via LM Studio (OpenAI-compatible)."""
    full_messages = [{"role": "system", "content": system_content}, *messages]

    try:
        response = await lm_client.chat.completions.create(
            model="local-model",
            messages=full_messages,
            tools=OPENAI_TOOLS,
            temperature=0.7,
            max_tokens=4096,
        )

        choice = response.choices[0]
        result = {"content": choice.message.content, "tool_calls": [], "engine": "lm_studio"}

        if choice.message.tool_calls:
            for tc in choice.message.tool_calls:
                result["tool_calls"].append({
                    "name": tc.function.name,
                    "arguments": json.loads(tc.function.arguments),
                })

        return result
    except Exception as e:
        return {"content": None, "error": str(e), "tool_calls": [], "engine": "lm_studio"}


async def _chat_claude(messages: list[dict], system_content: str) -> dict:
    """Chat via Claude API."""
    # Convert messages to Claude format
    claude_messages = []
    for msg in messages:
        if msg["role"] in ("user", "assistant"):
            claude_messages.append({"role": msg["role"], "content": msg["content"]})

    try:
        response = await claude_client.messages.create(
            model=CLOUD_MODEL,
            max_tokens=4096,
            system=system_content,
            messages=claude_messages,
            tools=CLAUDE_TOOLS,
        )

        result = {"content": "", "tool_calls": [], "engine": "claude"}

        for block in response.content:
            if block.type == "text":
                result["content"] += block.text
            elif block.type == "tool_use":
                result["tool_calls"].append({
                    "name": block.name,
                    "arguments": block.input,
                })

        return result
    except Exception as e:
        return {"content": None, "error": str(e), "tool_calls": [], "engine": "claude"}


# ── Streaming (for future use) ──

async def chat_stream(
    messages: list[dict],
    pitch_context: dict | None = None,
) -> AsyncGenerator[str, None]:
    """Stream chat — LM Studio only (Claude streaming handled differently)."""
    system_content = SYSTEM_PROMPT
    if pitch_context:
        system_content += f"\n\nCurrent pitch state:\n```json\n{json.dumps(pitch_context, indent=2)}\n```"

    full_messages = [{"role": "system", "content": system_content}, *messages]

    try:
        stream = await lm_client.chat.completions.create(
            model="local-model",
            messages=full_messages,
            tools=OPENAI_TOOLS,
            stream=True,
            temperature=0.7,
            max_tokens=4096,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if not delta:
                continue
            if delta.content:
                yield json.dumps({"type": "text", "content": delta.content}) + "\n"
            if delta.tool_calls:
                for tc in delta.tool_calls:
                    if tc.function:
                        yield json.dumps({"type": "tool_call", "name": tc.function.name, "arguments": tc.function.arguments}) + "\n"

        yield json.dumps({"type": "done"}) + "\n"
    except Exception as e:
        yield json.dumps({"type": "error", "message": str(e)}) + "\n"
