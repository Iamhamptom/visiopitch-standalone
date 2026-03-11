"""AI Engine — Gemini 2.5 Pro (primary) + LM Studio (local fallback).

Lovable-style: AI generates freeform HTML/CSS, rendered in sandboxed iframe.
"""

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

# ── System prompt: Freeform HTML/CSS code generation ──

SYSTEM_PROMPT = """You are VisioPitch AI — a world-class pitch designer that generates stunning, production-quality HTML/CSS pitch decks. You operate like Lovable or v0: you generate actual code, not templates.

## CORE RULE: GENERATE CODE, NOT DATA
When the user describes a pitch, you generate a COMPLETE, self-contained HTML document with inline CSS. Every pitch you create is unique — different layouts, typography, colors, animations, and visual hierarchy based on the brief.

## HOW YOU WORK
1. User describes their pitch (e.g., "Create a SaaS pitch for an analytics platform")
2. You call `set_html` with a FULL HTML document — complete `<!DOCTYPE html>` with `<style>` and `<body>`
3. The HTML renders live in an iframe preview
4. User iterates: "make the hero bigger", "change colors to teal", "add an animated gradient"
5. You call `set_html` again with the updated full HTML

## GENERATION STANDARDS

Every pitch HTML document MUST:
- Be a complete, valid HTML5 document with `<!DOCTYPE html>`, `<head>`, `<body>`
- Include ALL styles inline in a `<style>` tag (no external CSS)
- Use Google Fonts via `<link>` (Inter, Plus Jakarta Sans, Space Grotesk, Sora, DM Sans — pick what fits)
- Be responsive (use CSS grid, flexbox, clamp(), min/max, media queries)
- Include smooth animations (CSS transitions, @keyframes for hero sections, scroll-triggered fades)
- Have a dark theme by default (#0A0A0F background) unless user requests otherwise
- Use the accent color throughout (gradients, buttons, highlights, borders)
- Be visually stunning — glassmorphism, gradient text, subtle grain textures, aurora effects, glow shadows
- Include at least 7-10 sections for a complete pitch

## DESIGN PRINCIPLES
- **Typography**: Bold headlines (clamp 2.5-4rem), clean body text (0.9-1rem), generous letter-spacing on labels
- **Spacing**: Generous padding (80-120px vertical sections), breathing room between elements
- **Color**: Dark bg + accent color system. Use accent at 5%, 10%, 20%, 100% opacities
- **Cards**: Glassmorphism (rgba bg + blur + subtle border), hover transforms
- **Gradients**: Radial glows behind hero, linear gradients on text, mesh gradients for backgrounds
- **Animations**: Fade-in on scroll (IntersectionObserver), smooth hover states, pulsing CTAs
- **Layout**: Full-width hero, max-width 1000px content, CSS Grid for cards/pricing

## SECTION TYPES (use creatively, not rigidly)
- Hero: Big headline, subheadline, CTA button, background effects
- Problem/Story: Narrative section explaining the pain point
- Solution/Features: Card grid showing capabilities (icons + title + desc)
- Metrics/Proof: Big numbers in a grid (revenue, growth, users, etc.)
- Pricing/Investment: 2-3 tier cards with features lists
- Timeline/Roadmap: Visual timeline with phases and dates
- Team: Photo placeholders (colored avatars) with names and roles
- Comparison: Table or side-by-side comparison
- Testimonials: Quote cards with attribution
- CTA: Bold closing section with urgency
- Footer: Company name, tagline, legal

## WHAT MAKES YOU DIFFERENT FROM A BLOCK BUILDER
- You can create ANY layout — asymmetric grids, bento layouts, full-bleed sections, split screens
- You can add animations — CSS keyframes, scroll effects, hover interactions
- Every pitch looks DIFFERENT — you're not filling in templates, you're designing from scratch
- You can use SVG illustrations, CSS art, gradient meshes, dot grids, noise textures
- You handle responsive design natively

## INDUSTRY-AWARE DESIGN
Pick design choices that match the industry:
- **Tech/SaaS**: Clean, minimal, blue/purple accents, monospace details, grid layouts
- **Music/Entertainment**: Bold, expressive, gradient-heavy, large type, dark luxury
- **Healthcare**: Clean, trustworthy, green/teal, lots of whitespace, soft radius
- **Finance**: Professional, navy/gold, data-forward, subtle animations
- **Agency/Creative**: Experimental layouts, bold colors, asymmetric, editorial feel
- **Fashion/Luxury**: Serif fonts, gold accents, minimal, high-end photography placeholders
- **Food/Restaurant**: Warm tones, earthy colors, rounded elements, inviting

## TOOL: set_html
Call this with a COMPLETE HTML document. The `html` field should contain the ENTIRE page.
Also provide `title` (pitch name) and `accent_color` (hex) for metadata.

## TOOL: update_meta
Call this to update just the title, accent_color, industry, client_name, or client_company without regenerating HTML.

## RESPONSE FORMAT
- When generating: Short message (1-2 sentences) about what you built, then call set_html
- When editing: Make the change, call set_html, confirm in one sentence
- NEVER ask clarifying questions on first message — BUILD FIRST, iterate after
- Exception: truly ambiguous messages like "hello" or "help"

## EDITING HTML
When the user asks for changes:
- You receive the current HTML in pitch context
- Modify the relevant sections in the HTML
- Call set_html with the FULL updated HTML document (not a diff)
- Be fast and decisive — "make it more premium" means upgrade fonts, colors, spacing immediately

## IMPORTANT CONSTRAINTS
- NO external JS libraries (no React, no Tailwind CDN, no jQuery)
- NO external images (use CSS gradients, SVG inline, or colored div placeholders)
- ALL CSS must be in a single <style> tag in the <head>
- Minimal inline JS is OK for scroll animations (IntersectionObserver) and interactions
- Keep total HTML under 50KB (plenty for a rich pitch)
- Use semantic HTML (sections, headers, nav, footer)
"""


# ── Tool schemas ──

TOOLS_SCHEMA = [
    {
        "name": "set_html",
        "description": "Set the complete HTML content of the pitch. Provide a full HTML document with inline CSS.",
        "parameters": {
            "type": "object",
            "properties": {
                "html": {
                    "type": "string",
                    "description": "Complete HTML document (<!DOCTYPE html> ... </html>) with inline <style> CSS",
                },
                "title": {
                    "type": "string",
                    "description": "Pitch title for metadata",
                },
                "accent_color": {
                    "type": "string",
                    "description": "Primary accent color hex (e.g., #6C5CE7)",
                },
                "industry": {
                    "type": "string",
                    "description": "Industry category",
                },
                "client_name": {
                    "type": "string",
                    "description": "Client name",
                },
                "client_company": {
                    "type": "string",
                    "description": "Client company name",
                },
            },
            "required": ["html"],
        },
    },
    {
        "name": "update_meta",
        "description": "Update pitch metadata without regenerating HTML",
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
        ctx = {
            "title": pitch_context.get("title"),
            "industry": pitch_context.get("industry"),
            "client_name": pitch_context.get("client_name"),
            "client_company": pitch_context.get("client_company"),
            "accent_color": pitch_context.get("accent_color"),
            "has_html": bool(pitch_context.get("html_content")),
        }
        system_content += f"\n\nPitch metadata:\n```json\n{json.dumps(ctx, indent=2)}\n```"
        if pitch_context.get("html_content"):
            # Send current HTML so AI can edit it
            html = pitch_context["html_content"]
            # Truncate if extremely long to stay within limits
            if len(html) > 40000:
                html = html[:40000] + "\n<!-- ... truncated ... -->"
            system_content += f"\n\nCurrent HTML:\n```html\n{html}\n```"

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
    """Chat via Gemini API with function calling."""

    gemini_contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        gemini_contents.append({
            "role": role,
            "parts": [{"text": msg["content"]}],
        })

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
            "temperature": 0.85,
            "maxOutputTokens": 65536,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
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

        # Fallback: extract HTML from text if no tool call but HTML is present
        if not result["tool_calls"] and result["content"]:
            result = _extract_html_from_text(result)

        return result

    except Exception as e:
        return {"content": None, "error": str(e), "tool_calls": [], "engine": "gemini"}


def _extract_html_from_text(result: dict) -> dict:
    """Extract HTML document or JSON tool calls from text content (fallback)."""
    content = result["content"]

    # Try to find a complete HTML document in the response
    html_match = re.search(r'```html\s*(<!DOCTYPE html>.*?</html>)\s*```', content, re.DOTALL | re.IGNORECASE)
    if html_match:
        html = html_match.group(1)
        result["tool_calls"].append({
            "name": "set_html",
            "arguments": {"html": html},
        })
        result["content"] = re.sub(r'```html\s*<!DOCTYPE html>.*?</html>\s*```', '', content, flags=re.DOTALL | re.IGNORECASE).strip()
        return result

    # Also check for raw HTML without code fences
    if '<!DOCTYPE html>' in content and '</html>' in content:
        start = content.index('<!DOCTYPE html>')
        end = content.rindex('</html>') + len('</html>')
        html = content[start:end]
        result["tool_calls"].append({
            "name": "set_html",
            "arguments": {"html": html},
        })
        result["content"] = (content[:start] + content[end:]).strip()
        return result

    # Legacy: try JSON tool calls
    json_matches = re.findall(r'```json\s*(\{.*?\})\s*```', content, re.DOTALL)
    for match in json_matches:
        try:
            fixed = re.sub(r',\s*([}\]])', r'\1', match)
            parsed = json.loads(fixed)
            action = parsed.pop("action", parsed.pop("name", None))
            if action:
                result["tool_calls"].append({"name": action, "arguments": parsed})
                result["content"] = re.sub(r'```json\s*' + re.escape(match) + r'\s*```', '', content).strip()
                content = result["content"]
        except json.JSONDecodeError:
            pass

    return result


async def _chat_openai(messages: list[dict], system_content: str) -> dict:
    """Chat via LM Studio (OpenAI-compatible). Uses HTML-in-text mode."""
    html_system = system_content + """

IMPORTANT: When generating a pitch, output the complete HTML document inside a ```html code fence:
```html
<!DOCTYPE html>
<html>...your complete pitch...</html>
```

Include a brief conversational message before the HTML block."""

    full_messages = [{"role": "system", "content": html_system}, *messages]

    try:
        response = await lm_client.chat.completions.create(
            model="meta-llama-3.1-8b-instruct",
            messages=full_messages,
            temperature=0.7,
            max_tokens=16384,
        )

        choice = response.choices[0]
        content = choice.message.content or ""
        result = {"content": content, "tool_calls": [], "engine": "lm_studio"}

        return _extract_html_from_text(result)

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
        system_content += f"\n\nPitch metadata:\n```json\n{json.dumps(pitch_context, indent=2)}\n```"

    full_messages = [{"role": "system", "content": system_content}, *messages]

    try:
        stream = await lm_client.chat.completions.create(
            model="meta-llama-3.1-8b-instruct",
            messages=full_messages,
            stream=True,
            temperature=0.7,
            max_tokens=16384,
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
