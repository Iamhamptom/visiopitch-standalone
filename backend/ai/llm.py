"""AI Engine — Gemini 2.5 Pro (primary) + LM Studio (local fallback).

Lovable-style: AI generates freeform HTML/CSS, rendered in sandboxed iframe.
"""

import os
import json
import re
import random
import httpx
from typing import AsyncGenerator
from openai import AsyncOpenAI

# ── Clients ──

lm_client = AsyncOpenAI(
    base_url="http://localhost:1234/v1",
    api_key="lm-studio",
)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "") or os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY", "")
GEMINI_PRO = "gemini-2.5-pro"
GEMINI_FLASH = "gemini-2.5-flash"

# ── Style Seeds — randomized per generation for design variety ──

STYLE_SEEDS = [
    {
        "name": "Editorial Magazine",
        "heading_font": "DM Serif Display",
        "body_font": "DM Sans",
        "palette": ["#F5F0EB", "#2D2A26", "#C8553D", "#E8D5B7"],
        "bg": "#FAF7F2",
        "mood": "Warm editorial — asymmetric layouts, large serif headlines, generous whitespace, off-white backgrounds with warm accents",
        "card_style": "Minimal border, warm cream background, subtle shadow",
        "section_transition": "Thin horizontal line with dot accent",
    },
    {
        "name": "Brutalist Tech",
        "heading_font": "Space Grotesk",
        "body_font": "Space Mono",
        "palette": ["#00E8FF", "#0C0C0C", "#1A1A1A", "#3B3B3D"],
        "bg": "#0C0C0C",
        "mood": "Harsh cyber — monospace details, neon cyan accents, dot grid backgrounds, hard edges, no border-radius",
        "card_style": "Hard border 1px solid cyan, no radius, dark bg",
        "section_transition": "Neon line scan animation",
    },
    {
        "name": "Luxury Dark",
        "heading_font": "Playfair Display",
        "body_font": "Raleway",
        "palette": ["#D9B648", "#F7EBA5", "#0A0A0A", "#1A1A1A"],
        "bg": "#0A0A0A",
        "mood": "Opulence era — gold metallic text, generous negative space, serif headlines, grain texture overlay, minimal elements",
        "card_style": "Glass with gold border accent, subtle glow",
        "section_transition": "Gold gradient fade line",
    },
    {
        "name": "Soft Gradient",
        "heading_font": "Sora",
        "body_font": "Inter",
        "palette": ["#7C3AED", "#06B6D4", "#EC4899", "#0F172A"],
        "bg": "#0F172A",
        "mood": "Aurora dreamscape — floating orb gradients, glassmorphism cards, rounded everything (20px radius), pastel glow effects",
        "card_style": "Glassmorphism with blur(15px) and pastel border glow",
        "section_transition": "Gradient fade with floating orbs",
    },
    {
        "name": "Corporate Prestige",
        "heading_font": "IBM Plex Sans",
        "body_font": "IBM Plex Serif",
        "palette": ["#0A1A3C", "#143A75", "#BFD8FF", "#6AA2FF"],
        "bg": "#0A1A3C",
        "mood": "Navy authority — structured grid layouts, data-forward design, subtle animations, professional restraint",
        "card_style": "Flat with thin border, navy surface elevation",
        "section_transition": "Clean horizontal rule",
    },
    {
        "name": "Bold Creative",
        "heading_font": "Bebas Neue",
        "body_font": "Heebo",
        "palette": ["#FF1F8A", "#FF6EB4", "#FFCC70", "#0C0C0C"],
        "bg": "#0C0C0C",
        "mood": "Explosive energy — full-bleed color sections, deconstructed hero, oversized type, split-screen layouts, hot pink accents",
        "card_style": "Solid accent background with white text, no border",
        "section_transition": "Full-width color block change",
    },
    {
        "name": "Minimal Cloud",
        "heading_font": "Manrope",
        "body_font": "Inter",
        "palette": ["#18181B", "#F9F9F9", "#D9D9D9", "#7C7C7C"],
        "bg": "#FFFFFF",
        "mood": "Clean SaaS — extreme whitespace, monochrome with single accent, light backgrounds, precise alignment, airy feel",
        "card_style": "Light gray bg, subtle border, generous padding",
        "section_transition": "Extra whitespace (120px+) between sections",
    },
    {
        "name": "Warm Earthy",
        "heading_font": "Fraunces",
        "body_font": "Inter",
        "palette": ["#FFBF5E", "#2D5016", "#FFF8ED", "#8F6522"],
        "bg": "#FFF8ED",
        "mood": "Organic warmth — amber and forest green, rounded shapes, light cream backgrounds, nature-inspired patterns",
        "card_style": "Rounded 20px, warm cream bg, amber accent border",
        "section_transition": "Wavy SVG divider in earth tones",
    },
]


def _pick_style_seed(industry: str | None = None) -> dict:
    """Pick a style seed — industry-aware when possible, otherwise random."""
    industry_map = {
        "tech": ["Brutalist Tech", "Soft Gradient", "Minimal Cloud"],
        "music": ["Bold Creative", "Luxury Dark"],
        "healthcare": ["Minimal Cloud", "Corporate Prestige", "Warm Earthy"],
        "finance": ["Corporate Prestige", "Luxury Dark"],
        "agency": ["Bold Creative", "Editorial Magazine"],
        "fashion": ["Luxury Dark", "Editorial Magazine"],
        "food": ["Warm Earthy", "Editorial Magazine"],
        "education": ["Minimal Cloud", "Soft Gradient"],
        "real-estate": ["Corporate Prestige", "Luxury Dark"],
    }

    preferred_names = industry_map.get(industry or "", [])
    if preferred_names:
        preferred = [s for s in STYLE_SEEDS if s["name"] in preferred_names]
        if preferred:
            return random.choice(preferred)

    return random.choice(STYLE_SEEDS)


def _is_edit_request(message: str, has_html: bool) -> bool:
    """Detect if a message is a small edit vs a full generation request."""
    if not has_html:
        return False
    edit_words = ["change", "make", "update", "fix", "adjust", "move", "swap",
                  "replace", "remove", "delete", "add a", "bigger", "smaller",
                  "more", "less", "different", "color", "font", "text", "title"]
    msg_lower = message.lower().strip()
    if len(msg_lower) > 200:
        return False
    return any(w in msg_lower for w in edit_words)

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
- **Tech/SaaS**: Clean, minimal, blue/purple accents, monospace details, grid layouts. Palette: #00E8FF, #8A00FF, #101014. Fonts: Space Grotesk + Inter
- **Music/Entertainment**: Bold, expressive, gradient-heavy, large type, dark luxury. Palette: #FF1F8A, #FF6EB4, #0C0C0C. Fonts: Bebas Neue + Heebo
- **Healthcare**: Clean, trustworthy, green/teal, lots of whitespace, soft radius. Palette: #06b6d4, #14b8a6, #f0fdf4. Fonts: Manrope + Inter
- **Finance**: Professional, navy/gold, data-forward, subtle animations. Palette: #0A1A3C, #143A75, #BFD8FF, #D9B648. Fonts: IBM Plex Sans + IBM Plex Serif
- **Agency/Creative**: Experimental layouts, bold colors, asymmetric, editorial feel. Palette: #4158D0, #C850C0, #FFCC70. Fonts: Syne + Inter
- **Fashion/Luxury**: Serif fonts, gold accents, minimal, Opulence Era style. Palette: #000000, #1A1A1A, #D9B648, #F7EBA5. Fonts: Playfair Display + Raleway
- **Food/Restaurant**: Warm tones, earthy colors, rounded elements, inviting. Palette: #FF823A, #FF6D8B, #FFD1E4. Fonts: DM Serif Display + DM Sans

## ═══════════════════════════════════════════════
## DESIGN TOOLKIT — Production CSS Patterns (2025-2026)
## ═══════════════════════════════════════════════

### COLOR SYSTEM
Dark backgrounds (never pure #000000):
- Rich Black: #0a0a0a | Near Black: #0C0C0C | Charcoal: #1A1A1A | Dark Indigo: #101014 | Deep Navy: #050c29
Surface elevation layers: #0a0a0a → #121212 → #1e1e1e → #252525 → #2d2d2d → #333333
Text: Primary #FFFFFF, Secondary #d5d9ea, Muted #6b7280

### TYPOGRAPHY PAIRINGS (Google Fonts)
- DM Serif Display + DM Sans → elegant editorial
- Space Grotesk + Inter → tech-forward
- Playfair Display + Raleway → classic luxury
- Bebas Neue + Heebo → bold impact
- Sora + Space Mono → digital clarity
- Prata + Manrope Light → soft sophistication

Scale: Hero clamp(3rem,8vw,6rem), H1 clamp(2.5rem,5vw,4rem), H2 clamp(2rem,4vw,3rem), Body clamp(1rem,1.5vw,1.25rem)
Letter-spacing: Headlines -0.07em, Subheads -0.03em, Labels 0.05em

### GLASSMORPHISM (use on cards, navs, panels)
```css
background: rgba(255,255,255,0.08);
backdrop-filter: blur(15px) saturate(180%);
-webkit-backdrop-filter: blur(15px) saturate(180%);
border: 1px solid rgba(255,255,255,0.18);
border-radius: 20px;
box-shadow: 0 8px 32px rgba(31,38,135,0.37);
```
Hover: backdrop-filter blur(20px), bg rgba(255,255,255,0.15), translateY(-8px), shadow 0 16px 48px

### AURORA GRADIENT BACKGROUND (use on hero sections)
```css
.aurora { background: linear-gradient(-45deg, #0a0a0a, #1a0533, #0a192f, #0d1f22); background-size: 400% 400%; animation: aurora-shift 15s ease infinite; }
@keyframes aurora-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
```
Premium version: Add ::before and ::after pseudo-elements as floating blurred orbs (600px, border-radius:50%, filter:blur(80px), opacity:0.4) with radial-gradient colors, animated with translateX/Y over 20s

### MESH GRADIENT (static, lightweight)
```css
background-color: #0a0a0a;
background-image: radial-gradient(at 20% 30%, #7c3aed33 0px, transparent 50%), radial-gradient(at 80% 20%, #06b6d433 0px, transparent 50%), radial-gradient(at 50% 80%, #ec489933 0px, transparent 50%);
```

### GRAIN/NOISE TEXTURE OVERLAY
```css
.grainy::before { content:""; position:absolute; inset:0; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E"); background-size:182px; opacity:0.08; pointer-events:none; z-index:1; }
```

### DOT GRID BACKGROUND
```css
background-image: radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px);
background-size: 16px 16px;
```

### BENTO GRID LAYOUT (trending 2025-2026)
```css
display: grid; gap: 1rem; grid-template-columns: repeat(12, minmax(0,1fr)); grid-auto-rows: 90px; grid-auto-flow: dense;
/* Spans: .wide{grid-column:span 6;grid-row:span 2} .tall{grid-column:span 4;grid-row:span 3} .hero{grid-column:span 8;grid-row:span 3} */
```

### SCROLL-REVEAL ANIMATION (add IntersectionObserver JS)
```css
.reveal { opacity:0; transform:translateY(30px); transition:opacity 0.6s ease, transform 0.6s ease; }
.reveal.visible { opacity:1; transform:translateY(0); }
```
JS: `document.querySelectorAll('.reveal').forEach(el => new IntersectionObserver(([e])=>{if(e.isIntersecting){el.classList.add('visible')}},{threshold:0.1}).observe(el));`

### GRADIENT TEXT
```css
background: linear-gradient(135deg, ACCENT1, ACCENT2);
-webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
```
Gold metallic: linear-gradient(135deg, #D9B648, #F7EBA5, #D9B648)
Shimmer: background-size 200% auto, animate background-position to 200%

### BUTTON STYLES
Primary: background linear-gradient(135deg, ACCENT, darker), padding 14px 48px, border-radius 12px, hover translateY(-2px) + box-shadow
Ghost: transparent bg, border 1px solid rgba(255,255,255,0.2), hover bg rgba(255,255,255,0.05)
Glass: rgba(255,255,255,0.1) bg + backdrop-filter blur(10px), border-radius 50px (pill shape)
Pulse: @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(ACCENT,0.5)} 50%{box-shadow:0 0 0 12px rgba(ACCENT,0)} }

### SECTION TRANSITIONS
Gradient line: height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)
Dot separator: 3 small circles (4px) centered with gap:8px

### CARD STYLES
Glow: border 1px solid rgba(ACCENT,0.3), box-shadow 0 0 20px rgba(ACCENT,0.15)
Gradient border: ::before pseudo with inset:-1px, background linear-gradient, z-index:-1, border-radius+1px
Hover lift: transition all 0.3s cubic-bezier(0.4,0,0.2,1), hover translateY(-4px) + shadow 0 20px 40px rgba(0,0,0,0.3)

### 2025-2026 TRENDS TO FOLLOW
IN: Dark mode default, glassmorphism, bento grids, aurora gradients, grain textures, bold serif+sans pairings, gradient text, micro-animations, asymmetric layouts, floating pill navbars, variable typography with clamp()
OUT: Pure black backgrounds, heavy drop shadows, stock illustrations, >2 typefaces, cluttered slides, flat solid backgrounds, script fonts, body text <16px

## TOOL: set_html
Call this with a COMPLETE HTML document. The `html` field should contain the ENTIRE page.
Also provide `title` (pitch name) and `accent_color` (hex) for metadata.

## TOOL: update_meta
Call this to update just the title, accent_color, industry, client_name, or client_company without regenerating HTML.

## TOOL: generate_image
Call this to generate an AI image for the pitch. Returns a URL you can embed in HTML via `<img>` or `background-image: url(...)`.
Use for: hero backgrounds, product mockups, abstract art, section backgrounds.
DO NOT use for: team photos (use colored avatar placeholders), icons (use SVG), charts (use CSS).
When you generate an image, you'll receive the URL back — include it in your next set_html call.

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
    {
        "name": "generate_image",
        "description": "Generate an AI image for the pitch (hero backgrounds, product mockups, abstract art). The image URL will be returned for you to embed in the HTML.",
        "parameters": {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "Detailed image description (e.g., 'Abstract gradient mesh in purple and blue tones, 3D orbs floating, dark background')",
                },
                "style": {
                    "type": "string",
                    "description": "Image style hint",
                    "enum": ["abstract", "product", "background", "illustration", "photo"],
                },
            },
            "required": ["prompt"],
        },
    },
]


# ── Image Generation ──

async def generate_image(prompt: str, style: str = "abstract") -> dict:
    """Generate an image using Gemini Imagen API. Returns {"url": "...", "error": "..."}."""
    if not GEMINI_API_KEY:
        return {"error": "No GEMINI_API_KEY set"}

    # Use Imagen 3 Fast (available via Gemini API)
    imagen_url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-fast-generate-001:predict"

    enhanced_prompt = f"{prompt}. Style: {style}. High quality, professional, suitable for a business pitch deck."

    payload = {
        "instances": [{"prompt": enhanced_prompt}],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": "16:9" if style == "background" else "1:1",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{imagen_url}?key={GEMINI_API_KEY}",
                json=payload,
                headers={"Content-Type": "application/json"},
            )

            if resp.status_code != 200:
                return {"error": f"Imagen API error {resp.status_code}: {resp.text[:200]}"}

            data = resp.json()
            predictions = data.get("predictions", [])
            if not predictions:
                return {"error": "No image generated"}

            # Returns base64 image data
            image_bytes = predictions[0].get("bytesBase64Encoded", "")
            if not image_bytes:
                return {"error": "Empty image data"}

            return {"base64": image_bytes, "mime_type": "image/png"}

    except Exception as e:
        return {"error": str(e)}


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

def _build_system_content(pitch_context: dict | None = None, style_seed: dict | None = None) -> str:
    """Build the full system prompt with pitch context and style seed."""
    system_content = SYSTEM_PROMPT

    if style_seed:
        system_content += f"""

## STYLE DIRECTION FOR THIS PITCH
You MUST follow this design direction:
- **Style**: {style_seed['name']} — {style_seed['mood']}
- **Heading font**: {style_seed['heading_font']} (load from Google Fonts)
- **Body font**: {style_seed['body_font']} (load from Google Fonts)
- **Color palette**: {', '.join(style_seed['palette'])}
- **Background**: {style_seed['bg']}
- **Card style**: {style_seed['card_style']}
- **Section transitions**: {style_seed['section_transition']}

DO NOT default to purple gradients on dark backgrounds. USE the specific fonts and colors above.
DO NOT use Inter or Roboto as heading fonts — use the exact fonts specified."""

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
            html = pitch_context["html_content"]
            if len(html) > 40000:
                html = html[:40000] + "\n<!-- ... truncated ... -->"
            system_content += f"\n\nCurrent HTML:\n```html\n{html}\n```"

    return system_content


async def chat_complete(
    messages: list[dict],
    pitch_context: dict | None = None,
) -> dict:
    """Complete chat — uses Gemini Pro for generation, Flash for edits."""

    has_html = bool(pitch_context and pitch_context.get("html_content"))
    last_message = messages[-1]["content"] if messages else ""
    is_edit = _is_edit_request(last_message, has_html)

    # Pick style seed for new generations (not edits)
    style_seed = None
    if not is_edit:
        industry = pitch_context.get("industry") if pitch_context else None
        style_seed = _pick_style_seed(industry)

    system_content = _build_system_content(pitch_context, style_seed)

    # Dual model: Flash for edits (faster), Pro for generation (better quality)
    model = GEMINI_FLASH if is_edit else GEMINI_PRO
    temperature = 0.4 if is_edit else 1.0

    # Try Gemini first
    if GEMINI_API_KEY:
        result = await _chat_gemini(messages, system_content, model=model, temperature=temperature)
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


async def _chat_gemini(messages: list[dict], system_content: str, model: str = GEMINI_PRO, temperature: float = 0.85) -> dict:
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
            "temperature": temperature,
            "maxOutputTokens": 65536,
        },
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            resp = await client.post(
                f"{url}?key={GEMINI_API_KEY}",
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


# ── Streaming ──

async def chat_complete_stream(
    messages: list[dict],
    pitch_context: dict | None = None,
):
    """Stream chat completion — yields SSE events. Uses dual-model routing + style seeds."""
    has_html = bool(pitch_context and pitch_context.get("html_content"))
    last_message = messages[-1]["content"] if messages else ""
    is_edit = _is_edit_request(last_message, has_html)

    style_seed = None
    if not is_edit:
        industry = pitch_context.get("industry") if pitch_context else None
        style_seed = _pick_style_seed(industry)

    system_content = _build_system_content(pitch_context, style_seed)

    model = GEMINI_FLASH if is_edit else GEMINI_PRO
    temperature = 0.4 if is_edit else 1.0

    if GEMINI_API_KEY:
        async for event in _stream_gemini(messages, system_content, model=model, temperature=temperature):
            yield event
    else:
        yield {"type": "error", "content": "No AI engine available. Please set GEMINI_API_KEY."}


async def _stream_gemini(messages: list[dict], system_content: str, model: str = GEMINI_PRO, temperature: float = 0.85):
    """Stream via Gemini API using streamGenerateContent."""
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
            "temperature": temperature,
            "maxOutputTokens": 65536,
        },
    }

    stream_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={GEMINI_API_KEY}"

    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            async with client.stream(
                "POST",
                stream_url,
                json=payload,
                headers={"Content-Type": "application/json"},
            ) as response:
                if response.status_code != 200:
                    error = await response.aread()
                    yield {"type": "error", "content": f"Gemini API error {response.status_code}"}
                    return

                buffer = ""
                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        break

                    try:
                        data = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue

                    candidates = data.get("candidates", [])
                    if not candidates:
                        continue

                    parts = candidates[0].get("content", {}).get("parts", [])
                    for part in parts:
                        if "text" in part:
                            buffer += part["text"]
                            yield {"type": "text", "content": part["text"]}
                        elif "functionCall" in part:
                            fc = part["functionCall"]
                            yield {
                                "type": "tool_call",
                                "name": fc["name"],
                                "arguments": fc.get("args", {}),
                            }

                # If we got text but no tool call, try to extract HTML from the buffer
                yield {"type": "done", "full_text": buffer}

    except Exception as e:
        yield {"type": "error", "content": str(e)}
