# VisioPitch Master Architecture Plan
## From "Mediocre MVP" to "Product That Wins"

**Date**: March 12, 2026
**Research basis**: 6 parallel deep-research agents covering competitor architecture, pitch deck market, Gemini API optimization, streaming UX, PDF/image export, and full codebase audit.

---

## PART 1: HONEST ASSESSMENT — WHERE WE ARE

### What Works
- The **concept** is unique: no competitor generates actual HTML/CSS pitch pages (they all make slides)
- The core loop (describe → generate → preview → iterate) functions end-to-end
- The UI design quality of the shell (dashboard, nav, onboarding) is genuinely good
- Gemini 2.5 Pro produces decent HTML when given a good prompt
- Tome shut down April 2025 — 20M+ orphaned users need a new AI pitch tool

### What's Broken (Critical)
1. **SHA-256 password hashing with no salt** — trivially crackable (rainbow tables)
2. **Default JWT secret ships to production** if env var missing — anyone can forge tokens
3. **`iframe sandbox="allow-scripts allow-same-origin"`** — AI-generated JS can steal user tokens
4. **Shared Supabase instance** with VisioCorp production data — one leak exposes everything
5. **Two competing database systems** (Supabase vs unused SQLAlchemy), no migrations
6. **Three conflicting deployment configs** (Vercel, Render, Railway)
7. **~1,200 lines of dead code** (BlockInspector, BlockRenderer, legacy block tools, E2B sandbox, SQLAlchemy models, unused streaming function)

### What's Missing (For a Real Product)
- **Streaming preview** — users stare at a bouncing dot for 30-60 seconds while Gemini generates
- **PDF export** — only raw HTML download exists
- **Image generation** — no images at all, only CSS art
- **Version history** — no undo, no rollback, no branching
- **View analytics** — no tracking of who views shared pitches
- **Mobile builder** — completely broken below 900px
- **Rate limiting** — zero, on any endpoint
- **Tests** — zero test files
- **Error boundaries** — any component crash = blank screen

---

## PART 2: COMPETITIVE INTELLIGENCE — WHAT THE BEST DO

### How Lovable/v0/Bolt Actually Work

| | Bolt.new | v0 (Vercel) | Lovable |
|---|---|---|---|
| **Runtime** | WebContainer (in-browser WASM) | Vercel Sandbox (cloud VM) | Cloud sandbox (Fly.io) |
| **Model** | Claude Sonnet | Claude Sonnet (composite pipeline) | GPT-4 Mini + Claude Sonnet |
| **Edit strategy** | Full file rewrite | QuickEdit (100ms) for small changes | Full file rewrite |
| **Streaming** | XML artifact parser → file writes → Vite HMR | LLM Suspense (mid-stream error correction) | WebSocket → sandbox → Vite HMR |
| **Secret sauce** | Browser-based Node.js, no cloud needed | Composite model family: RAG + LLM Suspense + AutoFix | Visual Edit mode (click-to-edit UI) |

### Key Architectural Lessons

1. **v0's Composite Pipeline** is the real moat: RAG for context → LLM generation → mid-stream manipulation → post-stream auto-fix. Not just "call an LLM and render."
2. **Constrain the stack** (Lovable locks to React+Vite+Tailwind only) — focused prompts = better output.
3. **Stream structured output** (Bolt uses XML tags `<boltArtifact>`) — reliable parsing vs freeform text.
4. **Multi-model orchestration**: Fast model for routing/context, heavy model for generation, fine-tuned model for error correction.
5. **Version history is table stakes** — every platform supports revert/branch.
6. **100ms QuickEdit** (v0) — small changes should NOT trigger a full 60-second regeneration.

### Pitch Deck Market Intelligence

- **Gamma.app** dominates web-native but users hate repetitive designs and broken exports
- **Beautiful.ai** has best auto-layout engine but no free tier, no HTML output
- **Slidebean** has investor analytics (heat maps, drop-off tracking) that nobody else has
- **Tome is dead** — 20M orphaned users, the AI storytelling niche is wide open
- **No competitor generates HTML/CSS** — everyone makes slides. This is our differentiation.

### What Wins Deals (VC/Investor Consensus)
- Sequoia 10-slide format remains gold standard
- Investors spend **2 min 42 sec** on a deck before deciding
- One idea per slide, 10-14 slides max
- Dark backgrounds trending at YC/Techstars demo days 2026
- The "Newspaper Test" — can someone with no context explain your business after reading?

---

## PART 3: TECHNICAL DECISIONS

### Decision 1: Streaming Architecture
**Choice: SSE (Server-Sent Events) via FastAPI**

Why: WebSocket is overkill for one-directional streaming. SSE is simpler, works through proxies/CDNs, auto-reconnects, and FastAPI has native support via `StreamingResponse`. Gemini's `stream_generate_content()` returns chunks that map naturally to SSE events.

Flow:
```
User sends message → POST /api/pitches/{id}/chat/stream
→ FastAPI calls Gemini streamGenerateContent
→ Gemini streams response chunks
→ FastAPI forwards as SSE events (text/event-stream)
→ Frontend EventSource receives chunks
→ Accumulate HTML in buffer
→ After </style> tag appears, start rendering to iframe
→ Debounce iframe updates every 500ms
→ Final SSE event triggers auto-save
```

### Decision 2: iframe Security
**Choice: `sandbox="allow-scripts"` only (remove `allow-same-origin`)**

Why: `allow-scripts` + `allow-same-origin` together defeat ALL sandbox protections. AI-generated JS can access parent page cookies and steal JWT tokens. Removing `allow-same-origin` means the iframe gets a unique opaque origin — it can run CSS animations and IntersectionObserver but cannot touch the parent page.

### Decision 3: AI Model Strategy
**Choice: Gemini 2.5 Pro for generation, Gemini 2.5 Flash for edits**

| Task | Model | Why |
|---|---|---|
| Initial page generation | Gemini 2.5 Pro | Higher design quality, better creativity |
| Small edits ("change color", "fix text") | Gemini 2.5 Flash | 3x faster, good enough for edits |
| Image generation | Imagen 4 Fast ($0.02/img) | Cheapest, fastest, good quality |
| SVG illustrations | Gemini 2.5 Flash | Can generate inline SVGs |

Parameters:
- Generation: temperature **1.2**, max_output_tokens **65536**, thinking budget **8192**
- Edits: temperature **0.4**, max_output_tokens **65536**, no thinking
- Always use function calling (not freeform text extraction)

### Decision 4: Design Diversity (Style Seeds)
**Choice: Randomized style seeds per generation**

The biggest problem: Gemini produces the same dark-mode-with-purple-gradient layout every time. Fix: inject a random "style seed" into each generation prompt that specifies exact fonts, colors, mood, and layout pattern.

8 pre-built style seeds:
1. **Editorial Magazine** — DM Serif Display + DM Sans, warm cream, asymmetric grid
2. **Brutalist Tech** — Space Grotesk + Space Mono, neon cyan on near-black, harsh grid
3. **Luxury Dark** — Playfair Display + Raleway, gold + ivory on black, lots of negative space
4. **Soft Gradient** — Sora + Inter, pastel aurora, rounded everything, glass cards
5. **Corporate Prestige** — IBM Plex Sans + Serif, navy + silver, structured grid
6. **Bold Creative** — Bebas Neue + Heebo, hot pink + orange, full-bleed, deconstructed
7. **Minimal Cloud** — Manrope + Inter, monochrome + one accent, extreme whitespace
8. **Warm Earthy** — Fraunces + Inter, amber + forest green, organic shapes

Each seed provides: heading font, body font, hex palette (4 colors), background treatment, card style, section transition style. Gemini receives one random seed per generation (unless user specifies a style).

### Decision 5: PDF Export
**Choice: Client-side `window.print()` (free) + Server-side Browserless.io (premium)**

Why: Browserless.io ($50/mo starter) renders HTML with full Chromium fidelity — glassmorphism, gradients, Google Fonts all work perfectly. WeasyPrint can't handle modern CSS. Client-side `html2canvas` produces blurry rasterized output.

Two-tier:
- **Quick Export**: Client-side `window.print()` with `@media print` styles → free, instant, user controls
- **HD Export**: API call → FastAPI → Browserless.io `/pdf` endpoint → pixel-perfect PDF

### Decision 6: Image Generation
**Choice: Imagen 4 Fast via Gemini API ($0.02/image)**

Types of images for pitches:
- **Hero backgrounds**: AI-generated abstract/gradient images
- **Product mockups**: AI-generated or user-uploaded
- **Team photos**: Always user-uploaded (AI fake people = ethically problematic)
- **Icons**: Lucide icon library or AI-generated SVG
- **Charts**: CSS-only (conic-gradient, grid bars) — works in PDF too

Storage: Supabase Storage bucket `pitch-images`, public URLs, on-the-fly transforms (resize, WebP).

### Decision 7: Authentication
**Choice: Replace SHA-256 with bcrypt, add refresh tokens**

- `bcrypt` for password hashing (with salt, 12 rounds)
- Access tokens: 15-minute expiry
- Refresh tokens: 30-day expiry, stored in `httpOnly` cookie
- Token rotation on refresh
- Rate limit: 5 login attempts per minute per IP

### Decision 8: Database
**Choice: Keep Supabase, delete SQLAlchemy, add migrations**

- Delete all SQLAlchemy code (`backend/db/database.py`, `backend/db/models.py`)
- Create SQL migration files for all Supabase tables
- Add `pitch_versions` table for version history
- Add `pitch_views` table for analytics
- Add indexes on hot query paths
- **Use a SEPARATE Supabase project** — do not share with VisioCorp

---

## PART 4: ARCHITECTURE — THE TARGET STATE

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                  │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Dashboard │  │   Builder    │  │    Public Viewer       │ │
│  │  (Light)  │  │   (Dark)     │  │    (Standalone)        │ │
│  │           │  │              │  │                        │ │
│  │ • Search  │  │ • Chat panel │  │ • Pitch render         │ │
│  │ • Grid    │  │ • SSE stream │  │ • View tracking        │ │
│  │ • Create  │  │ • iframe     │  │ • Approval flow        │ │
│  │ • Delete  │  │ • Code view  │  │ • OG meta tags         │ │
│  │           │  │ • Resizable  │  │                        │ │
│  └──────────┘  │ • Version hx │  └────────────────────────┘ │
│                │ • Export menu │                              │
│                │ • Responsive  │                              │
│                │ • Shortcuts   │                              │
│                └──────────────┘                              │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / SSE
┌──────────────────────────▼──────────────────────────────────┐
│                    BACKEND (FastAPI + Python)                 │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │  Auth API   │  │ Pitch CRUD │  │   AI Engine            │ │
│  │             │  │            │  │                        │ │
│  │ • bcrypt    │  │ • CRUD     │  │ • Style seed picker    │ │
│  │ • JWT       │  │ • Versions │  │ • Gemini Pro (gen)     │ │
│  │ • Refresh   │  │ • Share    │  │ • Gemini Flash (edit)  │ │
│  │ • Rate limit│  │ • Export   │  │ • SSE streaming        │ │
│  │             │  │ • Analytics│  │ • Image gen (Imagen)   │ │
│  └────────────┘  └────────────┘  │ • HTML validation      │ │
│                                  │ • Function calling      │ │
│                                  └────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    EXTERNAL SERVICES                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Supabase    │  │  Gemini API  │  │  Browserless.io  │  │
│  │  (SEPARATE   │  │              │  │  (PDF export)    │  │
│  │   PROJECT)   │  │  • 2.5 Pro   │  │                  │  │
│  │              │  │  • 2.5 Flash │  └──────────────────┘  │
│  │  • Auth      │  │  • Imagen 4  │                        │
│  │  • Database  │  │              │                        │
│  │  • Storage   │  └──────────────┘                        │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema (Target)

```sql
-- Users
vp_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,  -- bcrypt, NOT sha256
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pitches
vp_pitches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES vp_users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Untitled Pitch',
  description TEXT,
  industry TEXT DEFAULT 'general',
  status TEXT DEFAULT 'draft',  -- draft, review, sent, won, lost
  client_name TEXT,
  client_company TEXT,
  accent_color TEXT DEFAULT '#6366F1',
  html_content TEXT,  -- the main content (Lovable-style HTML)
  style_seed TEXT,  -- which design direction was used
  thumbnail_url TEXT,  -- OG image / preview thumbnail
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_pitches_user_updated ON vp_pitches(user_id, updated_at DESC);

-- Version History
vp_pitch_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID REFERENCES vp_pitches(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  html_content TEXT NOT NULL,
  title TEXT,
  message TEXT,  -- what changed ("Added pricing section")
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_versions_pitch ON vp_pitch_versions(pitch_id, version_number DESC);

-- Conversations
vp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID REFERENCES vp_pitches(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb
);
CREATE INDEX idx_conv_pitch ON vp_conversations(pitch_id);

-- Share Links
vp_pitch_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID REFERENCES vp_pitches(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,  -- short URL token
  password TEXT,  -- optional password protection
  expires_at TIMESTAMPTZ,
  allow_download BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- View Analytics
vp_pitch_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID REFERENCES vp_pitches(id) ON DELETE CASCADE,
  share_id UUID REFERENCES vp_pitch_shares(id),
  viewer_ip TEXT,
  viewer_ua TEXT,
  duration_seconds INT,
  scroll_depth FLOAT,  -- 0.0 to 1.0
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_views_pitch ON vp_pitch_views(pitch_id, created_at DESC);

-- Uploaded Assets
vp_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID REFERENCES vp_pitches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES vp_users(id),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_type TEXT,  -- image/png, image/jpeg, etc
  file_size INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## PART 5: IMPLEMENTATION ROADMAP

### Phase 0: Foundation (Security + Cleanup)
**Priority: CRITICAL — do this before anything else**
**Estimated scope: ~15 files changed**

- [ ] **Replace SHA-256 with bcrypt** in `backend/api/auth.py`
- [ ] **Remove default JWT secret** — fail loudly if `JWT_SECRET` not set
- [ ] **Fix iframe sandbox** — remove `allow-same-origin`, use `sandbox="allow-scripts"` only
- [ ] **Sanitize AI HTML** — strip `<script>`, `onclick`, `javascript:` URIs before storing
- [ ] **Delete dead code**: BlockInspector.tsx, BlockRenderer.tsx (keep PitchViewer legacy fallback), SQLAlchemy models, E2B sandbox files, unused streaming function, render.yaml, railway.toml
- [ ] **Delete fake social proof** from Landing.tsx (Spotify, Netflix, etc.)
- [ ] **Fix duplicate `update_meta`** in pitches.py (lines 229 and 297)
- [ ] **Add rate limiting** — at minimum on auth endpoints (5/min/IP)
- [ ] **Create separate Supabase project** for VisioPitch (do not share with VisioCorp)
- [ ] **Add React error boundary** wrapper component
- [ ] **Fix `.env.example`** — list all required vars

### Phase 1: Streaming Preview
**Priority: HIGH — this is the #1 UX gap**
**Estimated scope: 3 backend files, 2 frontend files**

- [ ] **Backend**: New SSE endpoint `POST /api/pitches/{id}/chat/stream`
  - Calls `Gemini streamGenerateContent`
  - Forwards chunks as SSE events: `event: chunk`, `event: tool_call`, `event: done`
  - Extracts function calls from stream for `set_html`
  - Saves final HTML + conversation on `done`
- [ ] **Frontend**: Replace `fetch` with `EventSource` in Builder
  - Accumulate HTML chunks in a ref buffer
  - Start iframe rendering after `</style>` tag detected
  - Debounce iframe updates every 500ms during streaming
  - Show streaming progress indicator (not just bouncing dots)
  - Use Blob URL for iframe src (not `doc.write()`) — cleaner, no escaping issues
- [ ] **Loading UX**: Show a shimmer overlay on the canvas while generating, with word count / size indicator

### Phase 2: Design Quality Revolution
**Priority: HIGH — this is what makes the product worth using**
**Estimated scope: 2 backend files, 1 frontend file**

- [ ] **Style seed system** in `backend/ai/llm.py`:
  - 8 predefined style seeds (Editorial, Brutalist, Luxury, Soft, Corporate, Bold, Minimal, Earthy)
  - Random selection on first generation (store chosen seed on pitch)
  - User can override via "make it more editorial" or "luxury style"
  - Each seed provides: heading font, body font, 4-color palette, bg treatment, card style
- [ ] **Dual-model routing**:
  - Detect edit intent vs generation intent from user message
  - Generation → Gemini 2.5 Pro (temp 1.2, thinking 8192)
  - Edits → Gemini 2.5 Flash (temp 0.4, no thinking) — 3x faster
  - Heuristic: if `pitch.html_content` exists AND message is <50 chars AND contains edit words → Flash
- [ ] **Negative prompt**: Add explicit "DO NOT" rules — no purple-on-white, no Inter font, no generic layouts, no lorem ipsum
- [ ] **Section-level editing**: For targeted edits, use BeautifulSoup to extract relevant section, send only that section to Flash, splice back

### Phase 3: Image Generation
**Priority: MEDIUM-HIGH — users asked for this specifically**
**Estimated scope: 3 backend files, 2 frontend files**

- [ ] **Add `generate_image` tool** to Gemini function calling schema
  - AI decides when a section needs an image (hero background, product mockup, etc.)
  - Calls Imagen 4 Fast ($0.02/image) with prompt
  - Uploads to Supabase Storage `pitch-images` bucket
  - Returns public URL, AI embeds in HTML via `<img>` or `background-image`
- [ ] **Upload endpoint** `POST /api/pitches/{id}/upload`
  - Accept PNG/JPEG/WebP, max 10MB
  - Store in Supabase Storage
  - Return public URL for AI to reference
- [ ] **Asset management**: Track uploaded/generated images per pitch in `vp_assets` table
- [ ] **Inline SVG generation**: For icons and simple illustrations, have Gemini generate SVG directly in HTML (no image API call needed)

### Phase 4: Export Suite
**Priority: MEDIUM — needed for the product to be useful**
**Estimated scope: 4 backend files, 3 frontend files**

- [ ] **Quick PDF**: Add `@media print` styles to AI-generated HTML (page breaks, color-adjust)
  - Frontend: "Quick PDF" button triggers `window.print()` on iframe content
- [ ] **HD PDF**: `POST /api/pitches/{id}/export/pdf`
  - FastAPI renders pitch HTML with all images
  - Sends to Browserless.io `/pdf` endpoint
  - Returns PDF binary as download
  - Add Browserless.io API key to env vars
- [ ] **Image export**: `POST /api/pitches/{id}/export/image`
  - Browserless.io `/screenshot` endpoint
  - Full-page PNG, used for thumbnails and OG images
- [ ] **Export menu** in Builder toolbar:
  - Download HTML (existing)
  - Quick PDF (new — `window.print()`)
  - HD PDF (new — server-side)
  - Copy Share Link (existing)
  - Download Image (new)

### Phase 5: Version History & Undo
**Priority: MEDIUM — table stakes for a builder tool**
**Estimated scope: 3 backend files, 2 frontend files**

- [ ] **Auto-version**: Every `set_html` tool call creates a new version in `vp_pitch_versions`
  - Store version number, HTML snapshot, AI-generated change description
- [ ] **Version API**:
  - `GET /api/pitches/{id}/versions` — list versions (id, number, message, date)
  - `POST /api/pitches/{id}/versions/{vid}/restore` — restore a specific version
- [ ] **Frontend version panel**: Slide-out panel showing version timeline
  - Click any version to preview it
  - "Restore" button to revert
  - Show diff indicator (what changed between versions)
- [ ] **Undo/Redo**: Cmd+Z / Cmd+Shift+Z navigate through version stack

### Phase 6: Builder UX Polish
**Priority: MEDIUM — makes it feel professional**
**Estimated scope: 5 frontend files**

- [ ] **Resizable panels**: `react-resizable-panels` for chat/canvas split
- [ ] **Keyboard shortcuts**:
  - Cmd+Enter: Send message
  - Cmd+S: Force save
  - Cmd+Z/Shift+Z: Undo/redo
  - Escape: Exit fullscreen
  - Cmd+Shift+C: Toggle code view
- [ ] **Mobile responsive builder**:
  - <768px: Single panel with bottom tab bar (Chat / Preview / Code)
  - 768-1024px: Two panels, chat collapses to icon
  - 1024px+: Full layout
- [ ] **Toast notifications**: Use `sonner` for save/export/share feedback (replace inline status)
- [ ] **Error boundary**: Wrap Builder in error boundary with "Something went wrong, reload" fallback
- [ ] **Template gallery improvement**: Show visual previews (thumbnails) instead of text-only cards

### Phase 7: Analytics & Sharing
**Priority: LOWER — differentiator, not blocker**
**Estimated scope: 4 backend files, 3 frontend files**

- [ ] **Share link system**:
  - Generate short tokens (nanoid)
  - Optional password protection
  - Optional expiry date
  - Optional download permission
- [ ] **View tracking**:
  - Track: viewer IP (hashed), user agent, duration, scroll depth
  - IntersectionObserver in public viewer to track section engagement
- [ ] **Analytics dashboard** on pitch detail:
  - Total views, unique viewers
  - Average time spent
  - Scroll depth heat map
  - View timeline chart
- [ ] **OG meta tags**: Dynamic `og:image`, `og:title`, `og:description` on public view pages

### Phase 8: Quality & Infrastructure
**Priority: ONGOING**

- [ ] **Migration system**: SQL migration files in `migrations/` folder, numbered
- [ ] **CI/CD**: GitHub Actions — lint, typecheck, build on every push
- [ ] **Tests**:
  - Backend: pytest for auth, pitch CRUD, AI engine (mock Gemini)
  - Frontend: Vitest for component tests
  - E2E: Playwright for critical flows (login → create → generate → export)
- [ ] **Error tracking**: Sentry for both frontend and backend
- [ ] **Usage tracking**: Token usage per user, cost per pitch, daily/monthly limits
- [ ] **Rate limiting**: All endpoints, graduated by plan tier

---

## PART 6: COST MODEL

### Monthly Costs (at ~500 pitches/month)

| Service | Usage | Cost |
|---|---|---|
| Vercel Pro | Hosting + serverless | $20/mo |
| Supabase Pro | DB + Auth + Storage | $25/mo |
| Gemini API (Pro) | ~500 generations × ~30K tokens | ~$75/mo |
| Gemini API (Flash) | ~2000 edits × ~15K tokens | ~$30/mo |
| Imagen 4 Fast | ~2000 images | ~$40/mo |
| Browserless.io | ~500 PDF exports | ~$50/mo |
| **Total** | | **~$240/mo** |

### Revenue Model (Future)
- **Free tier**: 3 pitches/month, Quick PDF only, no analytics
- **Pro ($19/mo)**: Unlimited pitches, HD PDF, image generation, analytics
- **Team ($49/mo)**: Collaboration, custom domains, priority generation

---

## PART 7: WHAT MAKES THIS WIN

### Our Unique Advantages (No Competitor Has These)
1. **HTML/CSS output** — every competitor makes slides. We make web pages. This means infinite layout freedom, real animations, responsive design, embeddable anywhere.
2. **Style seeds** — 8 distinct design directions means every pitch looks different. Gamma users complain about repetitive designs.
3. **Full HTML export** — users OWN their output. No vendor lock-in. Host anywhere.
4. **Streaming preview** — watch your pitch build in real-time, like Lovable.
5. **Investor analytics** — know who viewed your pitch, for how long, and what they focused on (like Slidebean, but better).

### The Product Vision
VisioPitch is not a slide maker. It's an **AI pitch designer** that generates unique, production-quality web experiences. Every pitch is a custom-coded website — not a PowerPoint with a theme. Users describe what they need, AI designs it from scratch with trending design patterns, and the result is something they can share as a link, download as HTML, or export as PDF.

The experience should feel like having a senior designer on call 24/7 who delivers in 30 seconds instead of 3 days.

---

## EXECUTION ORDER (What to Build Next)

```
Phase 0 (Security)     ████████░░  ← DO THIS FIRST, non-negotiable
Phase 1 (Streaming)    ████████░░  ← Biggest UX impact
Phase 2 (Design Seeds) ██████████  ← Biggest quality impact
Phase 3 (Images)       ██████░░░░  ← User-requested
Phase 4 (Export)       ██████░░░░  ← Product completeness
Phase 5 (Versions)     ████░░░░░░  ← Table stakes
Phase 6 (UX Polish)    ████░░░░░░  ← Professional feel
Phase 7 (Analytics)    ████░░░░░░  ← Differentiator
Phase 8 (Infra)        ██░░░░░░░░  ← Ongoing
```

Phases 0-2 are the priority. They fix the critical problems and deliver the two biggest improvements: streaming preview (UX) and style seeds (quality). After those three phases, VisioPitch goes from "mediocre MVP" to "product worth showing people."
