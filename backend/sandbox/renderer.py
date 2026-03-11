"""Sandbox renderer — generates isolated HTML previews of pitch blocks."""

from jinja2 import Environment, BaseLoader
import json

env = Environment(loader=BaseLoader(), autoescape=True)

PITCH_PREVIEW_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{ title }} — VisioPitch Preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --accent: {{ accent }};
    --accent-20: {{ accent }}33;
    --accent-10: {{ accent }}1a;
    --accent-05: {{ accent }}0d;
    --bg: #0A0A0F;
    --bg-elevated: #111116;
    --bg-card: #16161D;
    --border: rgba(255,255,255,0.06);
    --border-accent: {{ accent }}44;
    --text: #EEEEF0;
    --text-secondary: rgba(255,255,255,0.55);
    --text-tertiary: rgba(255,255,255,0.3);
    --glass: rgba(255,255,255,0.03);
    --glass-border: rgba(255,255,255,0.08);
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg); color: var(--text); line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }

  /* Section base */
  .section {
    padding: 72px 48px;
    max-width: 900px;
    margin: 0 auto;
    position: relative;
  }
  .section + .section {
    border-top: 1px solid var(--border);
  }
  .section-label {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 0.65rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--accent);
    background: var(--accent-10); border: 1px solid var(--accent-20);
    padding: 4px 12px; border-radius: 100px; margin-bottom: 16px;
  }
  .section-title {
    font-size: 1.6rem; font-weight: 700; letter-spacing: -0.025em;
    margin-bottom: 12px; line-height: 1.2;
  }
  .section-sub {
    font-size: 0.95rem; color: var(--text-secondary); max-width: 600px;
    line-height: 1.7;
  }

  /* ─── HERO ─── */
  .hero {
    text-align: center; padding: 100px 48px 80px;
    position: relative; overflow: hidden;
  }
  .hero::before {
    content: ''; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 600px 400px at 50% 0%, {{ accent }}15 0%, transparent 70%),
      radial-gradient(ellipse 400px 300px at 30% 100%, {{ accent }}08 0%, transparent 60%);
    pointer-events: none;
  }
  .hero-overline {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--accent);
    background: var(--accent-10); border: 1px solid var(--accent-20);
    padding: 6px 16px; border-radius: 100px; margin-bottom: 24px;
  }
  .hero h1 {
    font-size: 3rem; font-weight: 800; letter-spacing: -0.035em;
    line-height: 1.1; margin-bottom: 16px;
    background: linear-gradient(135deg, var(--text) 40%, var(--accent) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .hero p {
    font-size: 1.1rem; color: var(--text-secondary);
    max-width: 520px; margin: 0 auto 32px; line-height: 1.7;
  }
  .hero-cta {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 14px 32px; background: var(--accent); color: #fff;
    border-radius: 10px; text-decoration: none; font-weight: 600;
    font-size: 0.9rem; transition: all 0.2s;
    box-shadow: 0 0 24px {{ accent }}40;
  }
  .hero-cta:hover { transform: translateY(-1px); box-shadow: 0 0 32px {{ accent }}55; }
  .hero-cta svg { width: 16px; height: 16px; }

  /* ─── STORY / TEXT ─── */
  .story-block, .text-block {
    padding: 64px 48px; max-width: 900px; margin: 0 auto;
  }
  .story-block h2, .text-block h3 {
    font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 16px;
  }
  .story-block p, .text-block p {
    color: var(--text-secondary); font-size: 0.95rem; line-height: 1.8;
    white-space: pre-wrap;
  }

  /* ─── PROOF / METRICS ─── */
  .proof { padding: 72px 48px; max-width: 900px; margin: 0 auto; }
  .proof-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 16px; margin-top: 24px;
  }
  .proof-card {
    text-align: center; padding: 28px 16px;
    background: var(--glass); border: 1px solid var(--glass-border);
    border-radius: 16px; position: relative; overflow: hidden;
  }
  .proof-card::before {
    content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
    width: 40px; height: 2px; background: var(--accent); border-radius: 0 0 2px 2px;
  }
  .proof-value {
    font-size: 2rem; font-weight: 800; letter-spacing: -0.03em;
    background: linear-gradient(135deg, var(--accent), var(--text));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .proof-label {
    font-size: 0.75rem; color: var(--text-tertiary);
    margin-top: 6px; text-transform: uppercase; letter-spacing: 0.04em;
  }

  /* ─── TIMELINE ─── */
  .timeline { padding: 72px 48px; max-width: 900px; margin: 0 auto; }
  .timeline-items { margin-top: 24px; position: relative; }
  .timeline-items::before {
    content: ''; position: absolute; left: 7px; top: 8px; bottom: 8px;
    width: 2px; background: linear-gradient(to bottom, var(--accent), var(--accent-20));
    border-radius: 2px;
  }
  .timeline-item {
    display: flex; gap: 20px; padding: 16px 0; position: relative;
  }
  .timeline-dot {
    width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0;
    border: 2px solid var(--accent); background: var(--bg);
    margin-top: 2px; z-index: 1;
  }
  .timeline-date {
    font-size: 0.7rem; color: var(--accent); font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px;
  }
  .timeline-title { font-size: 0.95rem; font-weight: 600; margin-bottom: 2px; }
  .timeline-desc { font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6; }

  /* ─── DELIVERABLES ─── */
  .deliverables { padding: 72px 48px; max-width: 900px; margin: 0 auto; }
  .deliverable-list { margin-top: 24px; }
  .deliverable-item {
    display: flex; align-items: flex-start; gap: 14px;
    padding: 16px 20px; border-radius: 12px;
    border: 1px solid transparent; transition: all 0.2s;
  }
  .deliverable-item:hover { border-color: var(--glass-border); background: var(--glass); }
  .deliverable-icon {
    width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.85rem; margin-top: 2px;
  }
  .deliverable-icon.included { background: var(--accent-10); color: var(--accent); }
  .deliverable-icon.excluded { background: rgba(255,255,255,0.04); color: var(--text-tertiary); }
  .deliverable-title { font-size: 0.9rem; font-weight: 600; }
  .deliverable-desc { font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px; }

  /* ─── BUDGET / PRICING ─── */
  .budget { padding: 72px 48px; max-width: 900px; margin: 0 auto; }
  .budget-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 20px; margin-top: 24px;
  }
  .budget-card {
    padding: 32px 24px; border: 1px solid var(--glass-border);
    border-radius: 16px; background: var(--glass); position: relative;
    transition: all 0.2s;
  }
  .budget-card:hover { border-color: rgba(255,255,255,0.12); transform: translateY(-2px); }
  .budget-card.highlighted {
    border-color: var(--border-accent); background: var(--accent-05);
  }
  .budget-card.highlighted::before {
    content: 'RECOMMENDED'; position: absolute; top: -10px; left: 50%;
    transform: translateX(-50%); font-size: 0.6rem; font-weight: 700;
    letter-spacing: 0.08em; color: #fff; background: var(--accent);
    padding: 3px 12px; border-radius: 100px;
  }
  .budget-name { font-size: 0.85rem; font-weight: 600; margin-bottom: 8px; }
  .budget-price { font-size: 2rem; font-weight: 800; letter-spacing: -0.03em; }
  .budget-period { font-size: 0.75rem; color: var(--text-tertiary); margin-top: 2px; }
  .budget-divider { height: 1px; background: var(--border); margin: 20px 0; }
  .budget-features { list-style: none; }
  .budget-features li {
    font-size: 0.82rem; padding: 6px 0; color: var(--text-secondary);
    display: flex; align-items: center; gap: 8px;
  }
  .budget-features li::before {
    content: ""; display: inline-block; width: 5px; height: 5px;
    border-radius: 50%; background: var(--accent); flex-shrink: 0;
  }

  /* ─── TEAM ─── */
  .team { padding: 72px 48px; max-width: 900px; margin: 0 auto; }
  .team-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 20px; margin-top: 24px;
  }
  .team-member {
    text-align: center; padding: 28px 16px;
    border: 1px solid var(--glass-border); border-radius: 16px;
    background: var(--glass); transition: all 0.2s;
  }
  .team-member:hover { border-color: rgba(255,255,255,0.12); transform: translateY(-2px); }
  .team-avatar {
    width: 56px; height: 56px; border-radius: 16px;
    background: linear-gradient(135deg, var(--accent-20), var(--accent-10));
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 12px; font-weight: 700; color: var(--accent);
    font-size: 1rem; letter-spacing: 0.02em;
  }
  .team-name { font-size: 0.9rem; font-weight: 600; }
  .team-role { font-size: 0.75rem; color: var(--text-tertiary); margin-top: 3px; }

  /* ─── FEATURES ─── */
  .features { padding: 72px 48px; max-width: 900px; margin: 0 auto; }
  .features-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px; margin-top: 24px;
  }
  .feature-card {
    padding: 28px 24px; border: 1px solid var(--glass-border);
    border-radius: 16px; background: var(--glass); transition: all 0.2s;
  }
  .feature-card:hover { border-color: rgba(255,255,255,0.12); }
  .feature-icon {
    width: 40px; height: 40px; border-radius: 12px;
    background: var(--accent-10); display: flex; align-items: center;
    justify-content: center; margin-bottom: 16px; font-size: 1.1rem;
  }
  .feature-title { font-size: 0.95rem; font-weight: 600; margin-bottom: 6px; }
  .feature-desc { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.6; }

  /* ─── COMPARISON ─── */
  .comparison { padding: 72px 48px; max-width: 900px; margin: 0 auto; }
  .comparison-table {
    width: 100%; border-collapse: separate; border-spacing: 0;
    margin-top: 24px; border: 1px solid var(--glass-border);
    border-radius: 16px; overflow: hidden;
  }
  .comparison-table th {
    padding: 16px 20px; text-align: left; font-size: 0.8rem;
    font-weight: 600; background: var(--bg-elevated);
    border-bottom: 1px solid var(--border);
  }
  .comparison-table td {
    padding: 14px 20px; font-size: 0.85rem; color: var(--text-secondary);
    border-bottom: 1px solid var(--border);
  }
  .comparison-table tr:last-child td { border-bottom: none; }
  .comparison-table tr:hover td { background: var(--glass); }

  /* ─── GALLERY ─── */
  .gallery { padding: 72px 48px; max-width: 900px; margin: 0 auto; }
  .gallery-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px; margin-top: 24px;
  }
  .gallery-item {
    border-radius: 16px; overflow: hidden;
    border: 1px solid var(--glass-border);
  }
  .gallery-item img {
    width: 100%; height: 200px; object-fit: cover;
  }
  .gallery-caption {
    padding: 12px 16px; font-size: 0.8rem; color: var(--text-secondary);
    background: var(--glass);
  }

  /* ─── CTA ─── */
  .cta-block {
    text-align: center; padding: 80px 48px;
    position: relative; overflow: hidden;
  }
  .cta-block::before {
    content: ''; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 500px 300px at 50% 100%, {{ accent }}12 0%, transparent 70%),
      radial-gradient(ellipse 400px 250px at 70% 0%, {{ accent }}08 0%, transparent 60%);
    pointer-events: none;
  }
  .cta-block h2 {
    font-size: 2rem; font-weight: 800; letter-spacing: -0.03em;
    margin-bottom: 12px; position: relative;
  }
  .cta-block p {
    color: var(--text-secondary); margin-bottom: 32px;
    max-width: 400px; margin-left: auto; margin-right: auto;
    font-size: 0.95rem; position: relative;
  }
  .cta-block .cta-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 16px 40px; background: var(--accent); color: #fff;
    border-radius: 12px; text-decoration: none; font-weight: 600;
    font-size: 0.95rem; position: relative;
    box-shadow: 0 0 32px {{ accent }}30;
    transition: all 0.2s;
  }
  .cta-block .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 0 40px {{ accent }}50; }

  /* ─── TERMS ─── */
  .terms-block { padding: 64px 48px; max-width: 900px; margin: 0 auto; }
  .terms-block h3 { font-size: 1.2rem; font-weight: 600; margin-bottom: 20px; }
  .terms-list { list-style: none; }
  .terms-list li {
    padding: 12px 0; color: var(--text-secondary); font-size: 0.85rem;
    border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px;
  }
  .terms-list li::before {
    content: ''; display: inline-block; width: 4px; height: 4px;
    border-radius: 50%; background: var(--text-tertiary); flex-shrink: 0;
  }

  /* ─── FOOTER ─── */
  .footer-block {
    text-align: center; padding: 40px 48px;
    border-top: 1px solid var(--border);
  }
  .footer-company { font-size: 0.9rem; font-weight: 600; }
  .footer-tagline { font-size: 0.8rem; color: var(--text-tertiary); margin-top: 4px; }
  .footer-note {
    font-size: 0.65rem; color: var(--text-tertiary); margin-top: 16px;
    opacity: 0.6;
  }
</style>
</head>
<body>
{% for block in blocks %}
{% if block.visible != false %}

  {% if block.type == "hero" %}
  <div class="section hero">
    {% if industry %}<div class="hero-overline">{{ industry | upper }}</div>{% endif %}
    <h1>{{ block.props.headline or "" }}</h1>
    <p>{{ block.props.subheadline or "" }}</p>
    {% if block.props.ctaText %}
    <a class="hero-cta" href="#">
      {{ block.props.ctaText }}
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
    </a>
    {% endif %}
  </div>

  {% elif block.type == "story" %}
  <div class="section story-block">
    <div class="section-label">Story</div>
    <h2>{{ block.props.title or "" }}</h2>
    <p>{{ block.props.body or "" }}</p>
  </div>

  {% elif block.type == "text" %}
  <div class="section text-block">
    {% if block.props.title %}<h3>{{ block.props.title }}</h3>{% endif %}
    <p>{{ block.props.body or "" }}</p>
  </div>

  {% elif block.type == "timeline" %}
  <div class="section timeline">
    <div class="section-label">Timeline</div>
    <div class="section-title">{{ block.props.title or "Timeline" }}</div>
    <div class="timeline-items">
      {% for item in block.props.items or [] %}
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div>
          <div class="timeline-date">{{ item.date or "" }}</div>
          <div class="timeline-title">{{ item.title or "" }}</div>
          <div class="timeline-desc">{{ item.description or "" }}</div>
        </div>
      </div>
      {% endfor %}
    </div>
  </div>

  {% elif block.type == "deliverables" %}
  <div class="section deliverables">
    <div class="section-label">Deliverables</div>
    <div class="section-title">{{ block.props.title or "Deliverables" }}</div>
    <div class="deliverable-list">
      {% for item in block.props.items or [] %}
      <div class="deliverable-item">
        <div class="deliverable-icon {{ 'included' if item.included else 'excluded' }}">
          {{ "&#10003;" if item.included else "&#9675;" }}
        </div>
        <div>
          <div class="deliverable-title">{{ item.title or "" }}</div>
          <div class="deliverable-desc">{{ item.description or "" }}</div>
        </div>
      </div>
      {% endfor %}
    </div>
  </div>

  {% elif block.type == "proof" %}
  <div class="section proof">
    <div class="section-label">Results</div>
    <div class="section-title">{{ block.props.title or "Proven Results" }}</div>
    <div class="proof-grid">
      {% for item in block.props.items or [] %}
      <div class="proof-card">
        <div class="proof-value">{{ item.value or "" }}</div>
        <div class="proof-label">{{ item.metric or "" }}</div>
      </div>
      {% endfor %}
    </div>
  </div>

  {% elif block.type == "budget" %}
  <div class="section budget">
    <div class="section-label">Investment</div>
    <div class="section-title">{{ block.props.title or "Investment" }}</div>
    <div class="budget-grid">
      {% for tier in block.props.tiers or [] %}
      <div class="budget-card {{ 'highlighted' if tier.highlighted else '' }}">
        <div class="budget-name">{{ tier.name or "" }}</div>
        <div class="budget-price">{{ tier.price or "" }}</div>
        <div class="budget-period">{{ tier.period or "" }}</div>
        <div class="budget-divider"></div>
        <ul class="budget-features">
          {% for f in tier.features or [] %}
          <li>{{ f }}</li>
          {% endfor %}
        </ul>
      </div>
      {% endfor %}
    </div>
  </div>

  {% elif block.type == "team" %}
  <div class="section team">
    <div class="section-label">Team</div>
    <div class="section-title">{{ block.props.title or "Your Team" }}</div>
    <div class="team-grid">
      {% for m in block.props.members or [] %}
      <div class="team-member">
        <div class="team-avatar">{{ m.name[:2] | upper if m.name else "?" }}</div>
        <div class="team-name">{{ m.name or "" }}</div>
        <div class="team-role">{{ m.role or "" }}</div>
      </div>
      {% endfor %}
    </div>
  </div>

  {% elif block.type == "features" %}
  <div class="section features">
    <div class="section-label">Features</div>
    <div class="section-title">{{ block.props.title or "Features" }}</div>
    <div class="features-grid">
      {% for item in block.props.items or [] %}
      <div class="feature-card">
        <div class="feature-icon">{{ item.icon or "&#9733;" }}</div>
        <div class="feature-title">{{ item.title or "" }}</div>
        <div class="feature-desc">{{ item.description or "" }}</div>
      </div>
      {% endfor %}
    </div>
  </div>

  {% elif block.type == "comparison" %}
  <div class="section comparison">
    <div class="section-label">Comparison</div>
    <div class="section-title">{{ block.props.title or "Comparison" }}</div>
    {% if block.props.columns and block.props.columns | length > 0 %}
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Feature</th>
          {% for col in block.props.columns %}
          <th>{{ col.name or "" }}</th>
          {% endfor %}
        </tr>
      </thead>
      <tbody>
        {% set first_col = block.props.columns[0] %}
        {% for item in first_col.items or [] %}
        <tr>
          <td style="font-weight:500; color: var(--text);">{{ item.label or "" }}</td>
          {% for col in block.props.columns %}
          <td>{{ col.items[loop.index0].value if col.items and loop.index0 < col.items | length else "" }}</td>
          {% endfor %}
        </tr>
        {% endfor %}
      </tbody>
    </table>
    {% endif %}
  </div>

  {% elif block.type == "gallery" %}
  <div class="section gallery">
    <div class="section-label">Gallery</div>
    <div class="section-title">{{ block.props.heading or "Gallery" }}</div>
    <div class="gallery-grid">
      {% for img in block.props.images or [] %}
      <div class="gallery-item">
        {% if img.url %}<img src="{{ img.url }}" alt="{{ img.caption or '' }}" loading="lazy">{% endif %}
        {% if img.caption %}<div class="gallery-caption">{{ img.caption }}</div>{% endif %}
      </div>
      {% endfor %}
    </div>
  </div>

  {% elif block.type == "cta" %}
  <div class="section cta-block">
    <h2>{{ block.props.headline or "" }}</h2>
    <p>{{ block.props.subheadline or "" }}</p>
    <a class="cta-btn" href="{{ block.props.buttonUrl or '#' }}">
      {{ block.props.buttonText or "Get Started" }}
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
    </a>
  </div>

  {% elif block.type == "terms" %}
  <div class="section terms-block">
    <h3>{{ block.props.title or "Terms" }}</h3>
    <ul class="terms-list">
      {% for item in block.props.items or [] %}
      <li>{{ item }}</li>
      {% endfor %}
    </ul>
  </div>

  {% elif block.type == "footer" %}
  <div class="footer-block">
    <div class="footer-company">{{ block.props.company or "" }}</div>
    {% if block.props.tagline %}<div class="footer-tagline">{{ block.props.tagline }}</div>{% endif %}
    <div class="footer-note">Built with VisioPitch</div>
  </div>

{% endif %}
{% endif %}
{% endfor %}
</body>
</html>"""


def render_pitch_html(pitch: dict) -> str:
    """Render a pitch to sandboxed HTML."""
    template = env.from_string(PITCH_PREVIEW_TEMPLATE)
    return template.render(
        title=pitch.get("title", "Untitled"),
        accent=pitch.get("accent_color", "#3B82F6"),
        industry=pitch.get("industry", ""),
        blocks=pitch.get("blocks", []),
    )
