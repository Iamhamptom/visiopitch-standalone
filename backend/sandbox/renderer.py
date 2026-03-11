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
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #09090B; color: #FAFAFA; line-height: 1.6;
  }
  .block { padding: 48px 40px; max-width: 800px; margin: 0 auto; }
  .block + .block { border-top: 1px solid rgba(255,255,255,0.05); }

  /* Hero */
  .hero { text-align: center; padding: 80px 40px; }
  .hero h1 { font-size: 2.5rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 12px; }
  .hero p { font-size: 1.1rem; color: rgba(255,255,255,0.5); max-width: 500px; margin: 0 auto; }
  .hero .cta-btn {
    display: inline-block; margin-top: 24px; padding: 12px 32px;
    background: {{ accent }}; color: #fff; border-radius: 8px;
    text-decoration: none; font-weight: 600; font-size: 0.9rem;
  }

  /* Story */
  .story h2 { font-size: 1.4rem; font-weight: 600; margin-bottom: 12px; }
  .story p { color: rgba(255,255,255,0.6); }

  /* Timeline */
  .timeline h2 { font-size: 1.4rem; font-weight: 600; margin-bottom: 20px; }
  .timeline-item {
    display: flex; gap: 16px; padding: 12px 0;
    border-left: 2px solid {{ accent }}33; margin-left: 8px; padding-left: 20px;
  }
  .timeline-date { font-size: 0.75rem; color: {{ accent }}; font-weight: 600; min-width: 80px; }
  .timeline-title { font-size: 0.9rem; font-weight: 500; }
  .timeline-desc { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin-top: 4px; }

  /* Deliverables */
  .deliverables h2 { font-size: 1.4rem; font-weight: 600; margin-bottom: 16px; }
  .deliverable-item {
    display: flex; align-items: center; gap: 12px; padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .deliverable-check { color: {{ accent }}; font-size: 1rem; }
  .deliverable-title { font-size: 0.9rem; }
  .deliverable-desc { font-size: 0.8rem; color: rgba(255,255,255,0.4); }

  /* Proof / Metrics */
  .proof h2 { font-size: 1.4rem; font-weight: 600; margin-bottom: 16px; }
  .proof-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
  .proof-card {
    text-align: center; padding: 20px 12px;
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
  }
  .proof-value { font-size: 1.5rem; font-weight: 700; color: {{ accent }}; }
  .proof-label { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-top: 4px; }

  /* Budget */
  .budget h2 { font-size: 1.4rem; font-weight: 600; margin-bottom: 16px; }
  .budget-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
  .budget-card {
    padding: 24px; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;
    background: rgba(255,255,255,0.02);
  }
  .budget-card.highlighted { border-color: {{ accent }}55; background: {{ accent }}08; }
  .budget-name { font-size: 0.85rem; font-weight: 600; margin-bottom: 4px; }
  .budget-price { font-size: 1.5rem; font-weight: 700; }
  .budget-period { font-size: 0.75rem; color: rgba(255,255,255,0.4); }
  .budget-features { margin-top: 16px; list-style: none; }
  .budget-features li { font-size: 0.8rem; padding: 4px 0; color: rgba(255,255,255,0.6); }
  .budget-features li::before { content: "✓ "; color: {{ accent }}; }

  /* Team */
  .team h2 { font-size: 1.4rem; font-weight: 600; margin-bottom: 16px; }
  .team-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }
  .team-member { text-align: center; }
  .team-avatar {
    width: 56px; height: 56px; border-radius: 50%;
    background: {{ accent }}20; display: flex; align-items: center;
    justify-content: center; margin: 0 auto 8px; font-weight: 700;
    color: {{ accent }}; font-size: 1.1rem;
  }
  .team-name { font-size: 0.9rem; font-weight: 600; }
  .team-role { font-size: 0.75rem; color: rgba(255,255,255,0.4); }

  /* CTA */
  .cta-block { text-align: center; padding: 60px 40px; }
  .cta-block h2 { font-size: 1.8rem; font-weight: 700; margin-bottom: 8px; }
  .cta-block p { color: rgba(255,255,255,0.5); margin-bottom: 24px; }
  .cta-block .cta-btn {
    display: inline-block; padding: 14px 36px;
    background: {{ accent }}; color: #fff; border-radius: 8px;
    text-decoration: none; font-weight: 600;
  }

  /* Text */
  .text-block h3 { font-size: 1.2rem; font-weight: 600; margin-bottom: 8px; }
  .text-block p { color: rgba(255,255,255,0.6); white-space: pre-wrap; }

  /* Footer */
  .footer-block {
    text-align: center; padding: 32px 40px;
    border-top: 1px solid rgba(255,255,255,0.05);
  }
  .footer-company { font-size: 0.9rem; font-weight: 600; }
  .footer-tagline { font-size: 0.8rem; color: rgba(255,255,255,0.3); margin-top: 4px; }
</style>
</head>
<body>
{% for block in blocks %}
{% if block.visible != false %}
  {% if block.type == "hero" %}
  <div class="block hero">
    <h1>{{ block.props.headline or "" }}</h1>
    <p>{{ block.props.subheadline or "" }}</p>
    {% if block.props.ctaText %}<a class="cta-btn" href="#">{{ block.props.ctaText }}</a>{% endif %}
  </div>

  {% elif block.type == "story" %}
  <div class="block story">
    <h2>{{ block.props.title or "" }}</h2>
    <p>{{ block.props.body or "" }}</p>
  </div>

  {% elif block.type == "timeline" %}
  <div class="block timeline">
    <h2>{{ block.props.title or "Timeline" }}</h2>
    {% for item in block.props.items or [] %}
    <div class="timeline-item">
      <div class="timeline-date">{{ item.date or "" }}</div>
      <div>
        <div class="timeline-title">{{ item.title or "" }}</div>
        <div class="timeline-desc">{{ item.description or "" }}</div>
      </div>
    </div>
    {% endfor %}
  </div>

  {% elif block.type == "deliverables" %}
  <div class="block deliverables">
    <h2>{{ block.props.title or "Deliverables" }}</h2>
    {% for item in block.props.items or [] %}
    <div class="deliverable-item">
      <span class="deliverable-check">{{ "✓" if item.included else "○" }}</span>
      <div>
        <div class="deliverable-title">{{ item.title or "" }}</div>
        <div class="deliverable-desc">{{ item.description or "" }}</div>
      </div>
    </div>
    {% endfor %}
  </div>

  {% elif block.type == "proof" %}
  <div class="block proof">
    <h2>{{ block.props.title or "Results" }}</h2>
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
  <div class="block budget">
    <h2>{{ block.props.title or "Investment" }}</h2>
    <div class="budget-grid">
      {% for tier in block.props.tiers or [] %}
      <div class="budget-card {{ 'highlighted' if tier.highlighted else '' }}">
        <div class="budget-name">{{ tier.name or "" }}</div>
        <div class="budget-price">{{ tier.price or "" }}</div>
        <div class="budget-period">{{ tier.period or "" }}</div>
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
  <div class="block team">
    <h2>{{ block.props.title or "Your Team" }}</h2>
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

  {% elif block.type == "cta" %}
  <div class="block cta-block">
    <h2>{{ block.props.headline or "" }}</h2>
    <p>{{ block.props.subheadline or "" }}</p>
    <a class="cta-btn" href="{{ block.props.buttonUrl or '#' }}">{{ block.props.buttonText or "Get Started" }}</a>
  </div>

  {% elif block.type == "text" %}
  <div class="block text-block">
    {% if block.props.title %}<h3>{{ block.props.title }}</h3>{% endif %}
    <p>{{ block.props.body or "" }}</p>
  </div>

  {% elif block.type == "terms" %}
  <div class="block text-block">
    <h3>{{ block.props.title or "Terms" }}</h3>
    <ul style="list-style: none; padding: 0;">
      {% for item in block.props.items or [] %}
      <li style="padding: 6px 0; color: rgba(255,255,255,0.5); font-size: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.04);">{{ item }}</li>
      {% endfor %}
    </ul>
  </div>

  {% elif block.type == "footer" %}
  <div class="block footer-block">
    <div class="footer-company">{{ block.props.company or "" }}</div>
    {% if block.props.tagline %}<div class="footer-tagline">{{ block.props.tagline }}</div>{% endif %}
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
        blocks=pitch.get("blocks", []),
    )
