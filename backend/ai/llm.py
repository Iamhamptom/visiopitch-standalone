"""AI Engine — Gemini 2.5 Pro (primary) + LM Studio (local fallback)."""

import os
import json
import re
import httpx
from typing import AsyncGenerator
from openai import AsyncOpenAI

# ── Clients ──

lm_client = AsyncOpenAI(
    base_url="http://localhost:1234/v1",
    api_key="lm-studio",
)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "") or os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY", "")
GEMINI_MODEL = "gemini-2.5-pro"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

# ── System prompt: Brief-first conversational design ──

SYSTEM_PROMPT = """You are VisioPitch AI — a world-class proposal & pitch deck design assistant.

## YOUR PERSONALITY
- Professional, confident, creative — like a top-tier design consultant
- Concise but warm — never robotic
- You understand business, design, and persuasion deeply

## WORKFLOW (CRITICAL — follow this order)

### Phase 1: DISCOVERY (first interaction with empty pitch)
When the user starts a new pitch, DO NOT immediately generate blocks.
Instead, ask smart questions to understand the brief:

1. "What is this pitch for?" — product, service, company overview, funding round
2. "Who is the audience?" — investors, potential clients, partners, internal stakeholders
3. "What industry?" — tech, healthcare, creative, agency, finance, real-estate, etc.
4. "What's the key message or goal?" — close a deal, raise funding, win a contract
5. "Do you have brand preferences?" — colors, style (modern/corporate/luxury/creative)
6. "Any specific sections you need?" — pricing, team, timeline, case studies

Ask 2-3 questions at a time, not all at once. Be conversational.

### Phase 2: BRIEF CONFIRMATION
Once you have enough info, summarize the brief:
"Here's what I'll build: [summary]. Ready to generate?"

### Phase 3: GENERATION
Generate the full pitch using the generate_pitch tool call. Include:
- A compelling hero with strong headline
- Problem/story section
- Solution/deliverables
- Proof metrics (real-sounding numbers)
- Pricing/budget tiers
- Team section
- Strong CTA

### Phase 4: REFINEMENT
Help iterate — change colors, rewrite copy, add/remove sections, adjust tone.

## DESIGN PRINCIPLES (World-Class Output)
- Headlines: Bold, benefit-driven, max 8 words
- Subheadlines: Supporting context, max 20 words
- Metrics: Use impressive but believable numbers (e.g., "47%", "3.2x", "$2.4M")
- Color: Default to industry-appropriate accent color
- Structure: Hero → Story → Proof → Deliverables → Budget → Team → CTA
- Tone: Match the industry — corporate for finance, creative for agency, technical for SaaS

## BLOCK TYPES & PROPS
- hero: headline, subheadline, ctaText
- text: title, body
- story: title, body
- timeline: title, items[] {date, title, description}
- deliverables: title, items[] {title, description, included: true/false}
- proof: title, items[] {value, metric}
- gallery: heading, images[] {url, caption}
- budget: title, tiers[] {name, price, period, features[], highlighted: true/false}
- team: title, members[] {name, role}
- terms: title, items[] (strings)
- cta: headline, subheadline, buttonText, buttonUrl
- footer: company, tagline
- features: title, items[] {title, description, icon}
- comparison: title, columns[] {name, items[] {label, value}}

## TOOL CALLS
Respond with JSON tool calls when the user asks to create or modify:
- generate_pitch: Full pitch generation
- add_block: Add a new block
- edit_block: Modify existing block by index
- remove_block: Delete block by index
- update_meta: Change title, accent_color, client_name, client_company, industry

ALWAYS include a conversational message alongside tool calls. Explain what you built."""


# ── Tool schemas (for JSON-mode fallback) ──

TOOLS_SCHEMA = [
    {
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
                "blocks": {"type": "array", "items": {"type": "object"}},
            },
            "required": ["title", "blocks"],
        },
    },
    {
        "name": "edit_block",
        "description": "Edit a specific block's content by index",
        "parameters": {
            "type": "object",
            "properties": {"block_index": {"type": "integer"}, "props": {"type": "object"}},
            "required": ["block_index", "props"],
        },
    },
    {
        "name": "add_block",
        "description": "Add a new block to the pitch",
        "parameters": {
            "type": "object",
            "properties": {
                "type": {"type": "string"},
                "props": {"type": "object"},
                "position": {"type": "string", "enum": ["start", "end", "before_cta"]},
            },
            "required": ["type", "props"],
        },
    },
    {
        "name": "remove_block",
        "description": "Remove a block by index",
        "parameters": {"type": "object", "properties": {"block_index": {"type": "integer"}}, "required": ["block_index"]},
    },
    {
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
]


# ── Engine detection ──

async def _is_lm_studio_online() -> bool:
    try:
        await lm_client.models.list()
        return True
    except Exception:
        return False


async def check_lm_studio() -> dict:
    """Check available AI engines."""
    lm_online = await _is_lm_studio_online()
    gemini_available = bool(GEMINI_API_KEY)

    if gemini_available:
        engine = "gemini"
    elif lm_online:
        engine = "lm_studio"
    else:
        engine = "none"

    return {
        "status": "online" if engine != "none" else "offline",
        "engine": engine,
        "lm_studio": "online" if lm_online else "offline",
        "gemini": "available" if gemini_available else "no_api_key",
    }


# ── Chat completion ──

async def chat_complete(
    messages: list[dict],
    pitch_context: dict | None = None,
) -> dict:
    """Complete chat — tries Gemini first, falls back to LM Studio."""

    system_content = SYSTEM_PROMPT
    if pitch_context:
        system_content += f"\n\nCurrent pitch state:\n```json\n{json.dumps(pitch_context, indent=2)}\n```"

    # Try Gemini first
    if GEMINI_API_KEY:
        result = await _chat_gemini(messages, system_content)
        if not result.get("error"):
            return result

    # Fallback to LM Studio
    if await _is_lm_studio_online():
        return await _chat_openai(messages, system_content)

    return {
        "content": "No AI engine available. Please set GEMINI_API_KEY.",
        "tool_calls": [],
        "engine": "none",
    }


async def _chat_gemini(messages: list[dict], system_content: str) -> dict:
    """Chat via Gemini API with tool-calling via JSON-in-response."""

    # Build Gemini request — use system instruction + function declarations
    gemini_contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        gemini_contents.append({
            "role": role,
            "parts": [{"text": msg["content"]}],
        })

    # Build function declarations for Gemini
    function_declarations = []
    for tool in TOOLS_SCHEMA:
        function_declarations.append({
            "name": tool["name"],
            "description": tool["description"],
            "parameters": tool["parameters"],
        })

    payload = {
        "system_instruction": {"parts": [{"text": system_content}]},
        "contents": gemini_contents,
        "tools": [{"function_declarations": function_declarations}],
        "generationConfig": {
            "temperature": 0.8,
            "maxOutputTokens": 8192,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json=payload,
                headers={"Content-Type": "application/json"},
            )

            if resp.status_code != 200:
                error_body = resp.text
                return {"content": None, "error": f"Gemini API error {resp.status_code}: {error_body}", "tool_calls": [], "engine": "gemini"}

            data = resp.json()

        result = {"content": "", "tool_calls": [], "engine": "gemini"}

        # Parse response parts
        candidates = data.get("candidates", [])
        if not candidates:
            return {"content": "No response from Gemini.", "tool_calls": [], "engine": "gemini"}

        parts = candidates[0].get("content", {}).get("parts", [])
        for part in parts:
            if "text" in part:
                result["content"] += part["text"]
            elif "functionCall" in part:
                fc = part["functionCall"]
                result["tool_calls"].append({
                    "name": fc["name"],
                    "arguments": fc.get("args", {}),
                })

        # Also try to parse JSON blocks from text (fallback if Gemini puts JSON in text)
        if not result["tool_calls"] and result["content"]:
            result = _extract_json_tool_calls(result)

        return result

    except Exception as e:
        return {"content": None, "error": str(e), "tool_calls": [], "engine": "gemini"}


def _extract_json_tool_calls(result: dict) -> dict:
    """Extract JSON tool calls from text content (fallback parsing)."""
    content = result["content"]
    json_matches = re.findall(r'```json\s*(\{.*?\})\s*```', content, re.DOTALL)
    for match in json_matches:
        try:
            fixed = re.sub(r':\s*(\d+[KMBkmb]+)', r': "\1"', match)
            fixed = re.sub(r',\s*([}\]])', r'\1', fixed)
            parsed = json.loads(fixed)
            action = parsed.pop("action", parsed.pop("name", "generate_pitch"))
            result["tool_calls"].append({"name": action, "arguments": parsed})
            result["content"] = re.sub(r'```json\s*' + re.escape(match) + r'\s*```', '', content).strip()
            content = result["content"]
        except json.JSONDecodeError:
            pass
    return result


async def _chat_openai(messages: list[dict], system_content: str) -> dict:
    """Chat via LM Studio (OpenAI-compatible). Uses JSON-in-text mode."""
    json_system = system_content + """

IMPORTANT: When the user asks you to create, generate, or modify a pitch, respond with a JSON block:
```json
{"action": "generate_pitch", "title": "...", "industry": "...", "accent_color": "#...", "blocks": [{"type": "hero", "props": {"headline": "...", "subheadline": "...", "ctaText": "..."}}, ...]}
```

For modifications:
- {"action": "add_block", "type": "...", "props": {...}}
- {"action": "edit_block", "block_index": 0, "props": {...}}
- {"action": "remove_block", "block_index": 0}
- {"action": "update_meta", "title": "...", "accent_color": "#..."}

Include a conversational message before the JSON block."""

    full_messages = [{"role": "system", "content": json_system}, *messages]

    try:
        response = await lm_client.chat.completions.create(
            model="meta-llama-3.1-8b-instruct",
            messages=full_messages,
            temperature=0.7,
            max_tokens=4096,
        )

        choice = response.choices[0]
        content = choice.message.content or ""
        result = {"content": content, "tool_calls": [], "engine": "lm_studio"}

        return _extract_json_tool_calls(result)

    except Exception as e:
        return {"content": None, "error": str(e), "tool_calls": [], "engine": "lm_studio"}


# ── Streaming (future) ──

async def chat_stream(
    messages: list[dict],
    pitch_context: dict | None = None,
) -> AsyncGenerator[str, None]:
    """Stream chat — LM Studio only."""
    system_content = SYSTEM_PROMPT
    if pitch_context:
        system_content += f"\n\nCurrent pitch state:\n```json\n{json.dumps(pitch_context, indent=2)}\n```"

    full_messages = [{"role": "system", "content": system_content}, *messages]

    try:
        stream = await lm_client.chat.completions.create(
            model="meta-llama-3.1-8b-instruct",
            messages=full_messages,
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

        yield json.dumps({"type": "done"}) + "\n"
    except Exception as e:
        yield json.dumps({"type": "error", "message": str(e)}) + "\n"
