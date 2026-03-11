"""LM Studio integration — OpenAI-compatible local inference."""

from openai import AsyncOpenAI
from typing import AsyncGenerator
import json

# LM Studio runs on localhost:1234 with OpenAI-compatible API
client = AsyncOpenAI(
    base_url="http://localhost:1234/v1",
    api_key="lm-studio",  # LM Studio doesn't need a real key
)

# Fallback: if LM Studio isn't running, we can use any OpenAI-compatible endpoint
SYSTEM_PROMPT = """You are VisioPitch AI — a pitch deck builder assistant.

You help users create compelling, professional pitch decks by:
1. Generating pitch content from prompts (titles, copy, structure)
2. Suggesting improvements to existing blocks
3. Adapting tone and style to the target industry
4. Writing persuasive copy for proposals

You have access to tools that modify the pitch. When the user asks to create or modify a pitch,
use the appropriate tool. Always respond conversationally and explain what you're doing.

Keep responses concise. Focus on action over explanation."""


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "generate_pitch",
            "description": "Generate a complete pitch from scratch based on industry, client, and description",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Pitch title"},
                    "industry": {"type": "string", "enum": ["music", "tech", "agency", "fashion", "real-estate", "food", "education", "healthcare", "finance", "general"]},
                    "client_name": {"type": "string", "description": "Client name"},
                    "client_company": {"type": "string", "description": "Client company"},
                    "accent_color": {"type": "string", "description": "Hex color for branding"},
                    "blocks": {
                        "type": "array",
                        "description": "Array of pitch blocks",
                        "items": {
                            "type": "object",
                            "properties": {
                                "type": {"type": "string"},
                                "props": {"type": "object"},
                            },
                        },
                    },
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
                    "block_index": {"type": "integer", "description": "Index of the block to edit"},
                    "props": {"type": "object", "description": "Updated properties"},
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
                    "props": {"type": "object", "description": "Block properties"},
                    "position": {"type": "string", "enum": ["start", "end", "before_cta"], "description": "Where to insert"},
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
            "parameters": {
                "type": "object",
                "properties": {
                    "block_index": {"type": "integer"},
                },
                "required": ["block_index"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_meta",
            "description": "Update pitch metadata (title, accent color, status, client info)",
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


async def chat_stream(
    messages: list[dict],
    pitch_context: dict | None = None,
) -> AsyncGenerator[str, None]:
    """Stream a chat response from LM Studio with tool use."""

    system_parts = [SYSTEM_PROMPT]
    if pitch_context:
        system_parts.append(f"\nCurrent pitch state:\n```json\n{json.dumps(pitch_context, indent=2)}\n```")

    full_messages = [
        {"role": "system", "content": "\n".join(system_parts)},
        *messages,
    ]

    try:
        stream = await client.chat.completions.create(
            model="local-model",  # LM Studio serves whatever model is loaded
            messages=full_messages,
            tools=TOOLS,
            stream=True,
            temperature=0.7,
            max_tokens=4096,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if not delta:
                continue

            # Text content
            if delta.content:
                yield json.dumps({"type": "text", "content": delta.content}) + "\n"

            # Tool calls
            if delta.tool_calls:
                for tc in delta.tool_calls:
                    if tc.function:
                        yield json.dumps({
                            "type": "tool_call",
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        }) + "\n"

        yield json.dumps({"type": "done"}) + "\n"

    except Exception as e:
        yield json.dumps({"type": "error", "message": str(e)}) + "\n"


async def chat_complete(
    messages: list[dict],
    pitch_context: dict | None = None,
) -> dict:
    """Non-streaming completion for tool-heavy operations."""

    system_parts = [SYSTEM_PROMPT]
    if pitch_context:
        system_parts.append(f"\nCurrent pitch state:\n```json\n{json.dumps(pitch_context, indent=2)}\n```")

    full_messages = [
        {"role": "system", "content": "\n".join(system_parts)},
        *messages,
    ]

    try:
        response = await client.chat.completions.create(
            model="local-model",
            messages=full_messages,
            tools=TOOLS,
            temperature=0.7,
            max_tokens=4096,
        )

        choice = response.choices[0]
        result = {"content": choice.message.content, "tool_calls": []}

        if choice.message.tool_calls:
            for tc in choice.message.tool_calls:
                result["tool_calls"].append({
                    "name": tc.function.name,
                    "arguments": json.loads(tc.function.arguments),
                })

        return result

    except Exception as e:
        return {"content": None, "error": str(e), "tool_calls": []}


async def check_lm_studio() -> dict:
    """Check if LM Studio is running and what model is loaded."""
    try:
        models = await client.models.list()
        model_list = [m.id for m in models.data]
        return {"status": "online", "models": model_list}
    except Exception as e:
        return {"status": "offline", "error": str(e)}
