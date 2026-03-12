import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, Share2, BarChart3, Layers } from 'lucide-react';

const FEATURES = [
  {
    icon: Zap,
    title: 'AI-Powered Generation',
    desc: 'Describe your pitch in plain English. AI builds hero sections, metrics, pricing tiers, and CTAs in seconds.',
  },
  {
    icon: Layers,
    title: '12 Block Types',
    desc: 'Hero, story, timeline, deliverables, proof metrics, budget, team, features, comparison, gallery, CTA, and more.',
  },
  {
    icon: Share2,
    title: 'One-Click Sharing',
    desc: 'Share via link, track views, get analytics. Know exactly when your pitch is opened and by whom.',
  },
  {
    icon: BarChart3,
    title: 'Built-In Analytics',
    desc: 'Track engagement, time spent, and section-by-section performance. Data-driven pitch optimization.',
  },
];

const SCREENS = [
  { label: 'Profile', color: '#E8F5E9' },
  { label: 'Wallet', color: '#E3F2FD' },
  { label: 'Welcome', color: '#FFF3E0' },
  { label: 'Pricing', color: '#F3E5F5' },
  { label: 'Dashboard', color: '#E0F7FA' },
  { label: 'Checkout', color: '#FCE4EC' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-text-inverted" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight">VisioPitch</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text transition-colors"
            >
              Log in
            </button>
            <button
              onClick={() => navigate('/register')}
              className="btn-primary text-sm py-2 px-5"
            >
              Join for free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-[1200px] mx-auto px-6 pt-24 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-bg-card border border-border rounded-full text-sm text-text-secondary mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Now with Gemini 2.5 Pro
          </div>

          <h1 className="text-[56px] leading-[1.05] font-bold tracking-[-0.035em] max-w-[700px] mx-auto mb-6">
            Build pitches that
            <br />
            <span className="text-text-tertiary">close deals.</span>
          </h1>

          <p className="text-lg text-text-secondary max-w-[480px] mx-auto mb-10 leading-relaxed">
            Describe your pitch in plain English. Watch AI design it live. Share with one click. Win the deal.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/register')}
              className="btn-primary text-[15px] py-3 px-7"
            >
              Start Building Free
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── Product Preview ── */}
      <section className="max-w-[1100px] mx-auto px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-2xl border border-border overflow-hidden bg-bg-elevated shadow-[0_2px_40px_rgba(0,0,0,0.06)]"
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-bg">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
              <div className="h-3 w-3 rounded-full bg-[#FEBD2E]" />
              <div className="h-3 w-3 rounded-full bg-[#28C840]" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="px-4 py-1 rounded-md bg-bg-card text-xs text-text-tertiary border border-border">
                visiopitch.app/builder
              </div>
            </div>
          </div>

          {/* App mockup — 2-panel builder */}
          <div className="flex min-h-[420px]">
            {/* Chat panel */}
            <div className="w-[320px] border-r border-border bg-bg p-5 flex flex-col">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-text-inverted" />
                </div>
                <div>
                  <div className="text-xs font-semibold">Pitch AI</div>
                  <div className="text-[10px] text-text-tertiary">Online</div>
                </div>
              </div>

              <div className="space-y-3 flex-1">
                <div className="bg-bg-card rounded-xl rounded-br-sm px-4 py-3 text-xs text-text-secondary ml-8">
                  Create a pitch for a healthcare SaaS targeting clinics in South Africa
                </div>
                <div className="bg-bg-elevated border border-border rounded-xl rounded-bl-sm px-4 py-3 text-xs text-text-secondary mr-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-2.5 w-2.5 text-brand" />
                    <span className="text-[9px] font-semibold text-brand">AI</span>
                  </div>
                  I've built your pitch with 8 sections: hero, proof metrics, features, pricing tiers, team, and CTA. Take a look!
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input
                  className="flex-1 px-3 py-2 text-xs bg-bg-card border border-border rounded-lg"
                  placeholder="Describe your pitch..."
                  readOnly
                />
                <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                  <ArrowRight className="h-3.5 w-3.5 text-text-inverted" />
                </div>
              </div>
            </div>

            {/* Canvas preview */}
            <div className="flex-1 bg-bg-elevated p-8 flex items-start justify-center">
              <div className="w-full max-w-[500px] space-y-4">
                {/* Hero block */}
                <div className="bg-bg rounded-xl border border-border p-8 text-center">
                  <div className="text-xl font-bold tracking-tight mb-1">VisioHealth OS</div>
                  <div className="text-sm text-text-secondary">AI-Powered Practice Management</div>
                  <button className="mt-4 px-5 py-2 bg-accent text-text-inverted text-xs font-medium rounded-full">
                    Book a Demo
                  </button>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { v: '45%', l: 'Less Admin' },
                    { v: '3x', l: 'Faster Billing' },
                    { v: '99.9%', l: 'Uptime' },
                  ].map((m) => (
                    <div key={m.l} className="bg-bg rounded-xl border border-border p-4 text-center">
                      <div className="text-lg font-bold">{m.v}</div>
                      <div className="text-[10px] text-text-tertiary">{m.l}</div>
                    </div>
                  ))}
                </div>

                {/* Pricing preview */}
                <div className="bg-bg rounded-xl border border-border p-5">
                  <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Investment</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { n: 'Starter', p: 'R7,500' },
                      { n: 'Professional', p: 'R15,000' },
                      { n: 'Enterprise', p: 'R30,000' },
                    ].map((t, i) => (
                      <div
                        key={t.n}
                        className={`p-3 rounded-lg text-center ${i === 1 ? 'bg-accent text-text-inverted' : 'bg-bg-card'}`}
                      >
                        <div className={`text-[10px] ${i === 1 ? 'text-text-inverted/70' : 'text-text-tertiary'}`}>{t.n}</div>
                        <div className="text-sm font-bold">{t.p}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Template gallery (Mobbin-style cards) ── */}
      <section className="max-w-[1200px] mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Find the perfect template<br />in seconds.
            </h2>
            <p className="text-text-secondary max-w-md mx-auto">
              10 industry templates. 12 block types. Customize everything with AI or drag-and-drop.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {SCREENS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group cursor-pointer"
              >
                <div
                  className="aspect-[3/4] rounded-2xl border border-border flex items-end p-4 transition-all group-hover:shadow-lg group-hover:-translate-y-1"
                  style={{ background: s.color }}
                >
                  <div className="w-full bg-white/80 backdrop-blur rounded-lg p-3">
                    <div className="h-2 w-16 bg-black/10 rounded-full mb-2" />
                    <div className="h-1.5 w-24 bg-black/5 rounded-full" />
                  </div>
                </div>
                <div className="text-xs text-text-secondary text-center mt-2.5 font-medium">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Features grid ── */}
      <section className="max-w-[1200px] mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Everything you need to win.
          </h2>
          <p className="text-text-secondary max-w-md mx-auto">
            From AI generation to live preview to one-click sharing — the entire pitch workflow.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group p-8 rounded-2xl border border-border hover:border-border-hover transition-all hover:shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
            >
              <div className="h-11 w-11 rounded-xl bg-bg-card flex items-center justify-center mb-5 group-hover:bg-accent group-hover:text-text-inverted transition-all">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-border py-16">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          {[
            { v: '12', l: 'Block Types' },
            { v: '10', l: 'Industry Templates' },
            { v: '<2min', l: 'To First Pitch' },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-4xl font-bold tracking-tight mb-1">{s.v}</div>
              <div className="text-sm text-text-secondary">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-[1200px] mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-bold tracking-tight mb-4">
          Ready to build your next pitch?
        </h2>
        <p className="text-text-secondary max-w-md mx-auto mb-10">
          Build professional pitches with AI — from idea to polished proposal in minutes.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/register')}
            className="btn-primary text-[15px] py-3 px-7"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="btn-secondary text-[15px] py-3 px-7"
          >
            Log in
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-accent flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-text-inverted" />
            </div>
            <span className="text-sm font-semibold">VisioPitch</span>
          </div>
          <p className="text-xs text-text-tertiary">Built by VisioCorp. AI-powered pitch builder.</p>
        </div>
      </footer>
    </div>
  );
}
