import type { PitchBlock } from '../../lib/api';

interface BlockRendererProps {
  block: PitchBlock;
  accent: string;
  industry?: string;
  selected?: boolean;
  onSelect?: () => void;
}

export default function BlockRenderer({ block, accent, industry, selected, onSelect }: BlockRendererProps) {
  const { type, props } = block;
  const p = props as Record<string, any>;

  return (
    <div
      onClick={onSelect}
      className={`relative group cursor-pointer transition-all duration-200 ${
        selected
          ? 'ring-2 ring-offset-2 ring-offset-bg-elevated'
          : 'hover:ring-1 hover:ring-border-hover hover:ring-offset-1 hover:ring-offset-bg-elevated'
      }`}
      style={selected ? { '--tw-ring-color': accent } as React.CSSProperties : undefined}
    >
      {/* Block type label on hover */}
      <div className="absolute -top-3 left-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: accent }}
        >
          {type}
        </span>
      </div>

      {type === 'hero' && <HeroBlock p={p} accent={accent} industry={industry} />}
      {type === 'story' && <StoryBlock p={p} accent={accent} />}
      {type === 'text' && <TextBlock p={p} />}
      {type === 'proof' && <ProofBlock p={p} accent={accent} />}
      {type === 'features' && <FeaturesBlock p={p} accent={accent} />}
      {type === 'deliverables' && <DeliverablesBlock p={p} accent={accent} />}
      {type === 'timeline' && <TimelineBlock p={p} accent={accent} />}
      {type === 'budget' && <BudgetBlock p={p} accent={accent} />}
      {type === 'team' && <TeamBlock p={p} accent={accent} />}
      {type === 'comparison' && <ComparisonBlock p={p} accent={accent} />}
      {type === 'gallery' && <GalleryBlock p={p} />}
      {type === 'cta' && <CtaBlock p={p} accent={accent} />}
      {type === 'terms' && <TermsBlock p={p} />}
      {type === 'footer' && <FooterBlock p={p} />}
    </div>
  );
}

// ── Individual block components ──

function SectionLabel({ label, accent }: { label: string; accent: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-4"
      style={{ color: accent, backgroundColor: `${accent}12`, border: `1px solid ${accent}25` }}
    >
      {label}
    </span>
  );
}

function HeroBlock({ p, accent, industry }: { p: any; accent: string; industry?: string }) {
  return (
    <div className="text-center py-16 px-8 relative overflow-hidden rounded-2xl bg-[#0A0A0F]">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 600px 400px at 50% 0%, ${accent}18 0%, transparent 70%)`
        }}
      />
      <div className="relative z-10">
        {industry && (
          <span
            className="inline-flex text-[11px] font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6"
            style={{ color: accent, backgroundColor: `${accent}15`, border: `1px solid ${accent}30` }}
          >
            {industry}
          </span>
        )}
        <h1
          className="text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.1] mb-4 bg-clip-text text-transparent"
          style={{ backgroundImage: `linear-gradient(135deg, #EEEEF0 40%, ${accent} 100%)` }}
        >
          {p.headline || 'Your Headline Here'}
        </h1>
        <p className="text-sm text-white/55 max-w-md mx-auto mb-8 leading-relaxed">
          {p.subheadline || 'Add a compelling subheadline'}
        </p>
        {p.ctaText && (
          <span
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: accent, boxShadow: `0 0 24px ${accent}40` }}
          >
            {p.ctaText}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}

function StoryBlock({ p, accent }: { p: any; accent: string }) {
  return (
    <div className="py-12 px-8 bg-[#0A0A0F] rounded-2xl">
      <SectionLabel label="Story" accent={accent} />
      <h2 className="text-xl font-bold text-white tracking-tight mb-3">{p.title || 'Our Story'}</h2>
      <p className="text-sm text-white/55 leading-relaxed whitespace-pre-wrap">{p.body || ''}</p>
    </div>
  );
}

function TextBlock({ p }: { p: any }) {
  return (
    <div className="py-10 px-8 bg-[#0A0A0F] rounded-2xl">
      {p.title && <h3 className="text-lg font-bold text-white tracking-tight mb-3">{p.title}</h3>}
      <p className="text-sm text-white/55 leading-relaxed whitespace-pre-wrap">{p.body || ''}</p>
    </div>
  );
}

function ProofBlock({ p, accent }: { p: any; accent: string }) {
  const items = p.items || [];
  return (
    <div className="py-12 px-8 bg-[#0A0A0F] rounded-2xl">
      <SectionLabel label="Results" accent={accent} />
      <h2 className="text-xl font-bold text-white tracking-tight mb-6">{p.title || 'Proven Results'}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item: any, i: number) => (
          <div key={i} className="text-center p-6 rounded-2xl border border-white/6 bg-white/[0.02] relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-b" style={{ backgroundColor: accent }} />
            <div
              className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, ${accent}, #EEEEF0)` }}
            >
              {item.value}
            </div>
            <div className="text-[11px] text-white/30 uppercase tracking-wider mt-1">{item.metric}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturesBlock({ p, accent }: { p: any; accent: string }) {
  const items = p.items || [];
  return (
    <div className="py-12 px-8 bg-[#0A0A0F] rounded-2xl">
      <SectionLabel label="Features" accent={accent} />
      <h2 className="text-xl font-bold text-white tracking-tight mb-6">{p.title || 'Features'}</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((item: any, i: number) => (
          <div key={i} className="p-6 rounded-2xl border border-white/6 bg-white/[0.02] hover:border-white/10 transition-all">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4" style={{ backgroundColor: `${accent}15` }}>
              {item.icon || '★'}
            </div>
            <div className="text-sm font-semibold text-white mb-1">{item.title}</div>
            <div className="text-xs text-white/50 leading-relaxed">{item.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeliverablesBlock({ p, accent }: { p: any; accent: string }) {
  const items = p.items || [];
  return (
    <div className="py-12 px-8 bg-[#0A0A0F] rounded-2xl">
      <SectionLabel label="Deliverables" accent={accent} />
      <h2 className="text-xl font-bold text-white tracking-tight mb-6">{p.title || 'Deliverables'}</h2>
      <div className="space-y-1">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex items-start gap-3 p-4 rounded-xl hover:bg-white/[0.02] transition-all">
            <div
              className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs mt-0.5"
              style={item.included !== false
                ? { backgroundColor: `${accent}15`, color: accent }
                : { backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }
              }
            >
              {item.included !== false ? '✓' : '○'}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{item.title}</div>
              {item.description && <div className="text-xs text-white/50 mt-0.5">{item.description}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineBlock({ p, accent }: { p: any; accent: string }) {
  const items = p.items || [];
  return (
    <div className="py-12 px-8 bg-[#0A0A0F] rounded-2xl">
      <SectionLabel label="Timeline" accent={accent} />
      <h2 className="text-xl font-bold text-white tracking-tight mb-6">{p.title || 'Timeline'}</h2>
      <div className="relative pl-6">
        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 rounded" style={{ background: `linear-gradient(to bottom, ${accent}, ${accent}30)` }} />
        {items.map((item: any, i: number) => (
          <div key={i} className="flex gap-4 pb-6 relative">
            <div className="w-4 h-4 rounded-full border-2 bg-[#0A0A0F] flex-shrink-0 mt-0.5 z-10" style={{ borderColor: accent }} />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: accent }}>{item.date}</div>
              <div className="text-sm font-semibold text-white">{item.title}</div>
              {item.description && <div className="text-xs text-white/50 mt-0.5 leading-relaxed">{item.description}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BudgetBlock({ p, accent }: { p: any; accent: string }) {
  const tiers = p.tiers || [];
  return (
    <div className="py-12 px-8 bg-[#0A0A0F] rounded-2xl">
      <SectionLabel label="Investment" accent={accent} />
      <h2 className="text-xl font-bold text-white tracking-tight mb-6">{p.title || 'Investment'}</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {tiers.map((tier: any, i: number) => (
          <div
            key={i}
            className={`p-6 rounded-2xl border relative transition-all hover:-translate-y-0.5 ${
              tier.highlighted
                ? 'bg-white/[0.03]'
                : 'bg-white/[0.01] border-white/6'
            }`}
            style={tier.highlighted ? { borderColor: `${accent}50`, backgroundColor: `${accent}08` } : undefined}
          >
            {tier.highlighted && (
              <span
                className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider text-white px-3 py-0.5 rounded-full"
                style={{ backgroundColor: accent }}
              >
                Recommended
              </span>
            )}
            <div className="text-xs font-semibold text-white/80 mb-2">{tier.name}</div>
            <div className="text-2xl font-extrabold text-white tracking-tight">{tier.price}</div>
            {tier.period && <div className="text-[11px] text-white/30 mt-0.5">{tier.period}</div>}
            <div className="h-px bg-white/6 my-4" />
            <ul className="space-y-2">
              {(tier.features || []).map((f: string, j: number) => (
                <li key={j} className="flex items-center gap-2 text-xs text-white/50">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamBlock({ p, accent }: { p: any; accent: string }) {
  const members = p.members || [];
  return (
    <div className="py-12 px-8 bg-[#0A0A0F] rounded-2xl">
      <SectionLabel label="Team" accent={accent} />
      <h2 className="text-xl font-bold text-white tracking-tight mb-6">{p.title || 'Your Team'}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {members.map((m: any, i: number) => (
          <div key={i} className="text-center p-6 rounded-2xl border border-white/6 bg-white/[0.02] hover:border-white/10 hover:-translate-y-0.5 transition-all">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold text-sm"
              style={{ background: `linear-gradient(135deg, ${accent}30, ${accent}15)`, color: accent }}
            >
              {m.name ? m.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
            </div>
            <div className="text-sm font-semibold text-white">{m.name}</div>
            <div className="text-[11px] text-white/30 mt-0.5">{m.role}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonBlock({ p, accent }: { p: any; accent: string }) {
  const columns = p.columns || [];
  if (columns.length === 0) return null;
  const firstCol = columns[0];
  return (
    <div className="py-12 px-8 bg-[#0A0A0F] rounded-2xl">
      <SectionLabel label="Comparison" accent={accent} />
      <h2 className="text-xl font-bold text-white tracking-tight mb-6">{p.title || 'Comparison'}</h2>
      <div className="overflow-x-auto rounded-2xl border border-white/6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#111116]">
              <th className="p-4 text-left text-xs font-semibold text-white/80 border-b border-white/6">Feature</th>
              {columns.map((col: any, i: number) => (
                <th key={i} className="p-4 text-left text-xs font-semibold text-white/80 border-b border-white/6">{col.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(firstCol.items || []).map((item: any, ri: number) => (
              <tr key={ri} className="hover:bg-white/[0.02]">
                <td className="p-4 text-xs font-medium text-white border-b border-white/6">{item.label}</td>
                {columns.map((col: any, ci: number) => (
                  <td key={ci} className="p-4 text-xs text-white/50 border-b border-white/6">
                    {col.items?.[ri]?.value || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GalleryBlock({ p }: { p: any }) {
  const images = p.images || [];
  return (
    <div className="py-12 px-8 bg-[#0A0A0F] rounded-2xl">
      <h2 className="text-xl font-bold text-white tracking-tight mb-6">{p.heading || 'Gallery'}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((img: any, i: number) => (
          <div key={i} className="rounded-2xl overflow-hidden border border-white/6">
            {img.url && <img src={img.url} alt={img.caption || ''} className="w-full h-40 object-cover" loading="lazy" />}
            {img.caption && <div className="p-3 text-xs text-white/50 bg-white/[0.02]">{img.caption}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CtaBlock({ p, accent }: { p: any; accent: string }) {
  return (
    <div className="text-center py-16 px-8 relative overflow-hidden bg-[#0A0A0F] rounded-2xl">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 500px 300px at 50% 100%, ${accent}15 0%, transparent 70%)`
        }}
      />
      <div className="relative z-10">
        <h2 className="text-2xl font-extrabold text-white tracking-tight mb-3">{p.headline || 'Ready to Start?'}</h2>
        <p className="text-sm text-white/50 max-w-sm mx-auto mb-8">{p.subheadline || ''}</p>
        <span
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-semibold text-sm"
          style={{ backgroundColor: accent, boxShadow: `0 0 32px ${accent}35` }}
        >
          {p.buttonText || 'Get Started'}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </span>
      </div>
    </div>
  );
}

function TermsBlock({ p }: { p: any }) {
  const items = p.items || [];
  return (
    <div className="py-10 px-8 bg-[#0A0A0F] rounded-2xl">
      <h3 className="text-lg font-semibold text-white mb-5">{p.title || 'Terms'}</h3>
      <ul className="space-y-0">
        {items.map((item: string, i: number) => (
          <li key={i} className="flex items-center gap-2.5 py-3 text-xs text-white/50 border-b border-white/6 last:border-0">
            <span className="w-1 h-1 rounded-full bg-white/20 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterBlock({ p }: { p: any }) {
  return (
    <div className="text-center py-8 px-8 border-t border-white/6 bg-[#0A0A0F] rounded-b-2xl">
      <div className="text-sm font-semibold text-white">{p.company || ''}</div>
      {p.tagline && <div className="text-xs text-white/30 mt-1">{p.tagline}</div>}
      <div className="text-[10px] text-white/20 mt-4">Built with VisioPitch</div>
    </div>
  );
}
