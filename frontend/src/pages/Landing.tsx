import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, ArrowRight, Layers, Zap, Share2,
  FileText, Send, BarChart3, Globe, Lock,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg gradient-accent flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-[15px] tracking-tight">VisioPitch</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className="btn-secondary text-xs py-2 px-4"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/register')}
              className="btn-primary text-xs py-2 px-4"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-40 pb-24 px-6 relative">
        <div className="absolute inset-0 aurora-bg opacity-60" />

        <div className="max-w-[720px] mx-auto text-center relative">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
            className="inline-flex items-center gap-2 chip chip-accent mb-8 text-xs"
          >
            <Zap className="h-3 w-3" />
            AI-Powered Proposal Builder
          </motion.div>

          <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-[clamp(40px,6vw,72px)] font-extrabold tracking-[-0.03em] leading-[1.05] mb-6"
          >
            Build proposals that
            <br />
            <span className="text-gradient">win every time</span>
          </motion.h1>

          <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-[17px] text-text-secondary max-w-[520px] mx-auto mb-10 leading-[1.6]"
          >
            Describe your pitch in plain English. AI designs a stunning proposal
            with metrics, pricing, and professional layouts — in seconds.
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="flex items-center justify-center gap-3"
          >
            <button
              onClick={() => navigate('/register')}
              className="btn-primary py-3 px-7 text-sm"
            >
              Start Building <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn-secondary py-3 px-6 text-sm"
            >
              Sign In
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Preview ── */}
      <section className="px-6 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-[1000px] mx-auto"
        >
          <div className="rounded-2xl border border-border overflow-hidden bg-bg-card">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-bg-elevated">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-1.5 rounded-md bg-bg-hover px-3 py-1 text-[10px] text-text-tertiary">
                  <Lock className="h-2.5 w-2.5" />
                  visiopitch.app/builder
                </div>
              </div>
            </div>

            {/* Builder mockup */}
            <div className="grid grid-cols-[320px_1fr] h-[480px]">
              {/* Chat */}
              <div className="border-r border-border p-5 flex flex-col gap-3 bg-bg-elevated">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-md gradient-accent flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold">Pitch AI</div>
                    <div className="text-[9px] text-text-tertiary">Gemini 2.5 Pro</div>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  className="rounded-xl bg-bg-hover px-3.5 py-2.5 text-[11px] text-text-secondary ml-6"
                >
                  Create a SaaS pitch for a healthcare platform targeting private clinics
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7 }}
                  className="glass-card rounded-xl px-3.5 py-2.5 text-[11px] text-text-secondary mr-4"
                >
                  <div className="flex items-center gap-1 mb-1">
                    <Sparkles className="h-2 w-2 text-accent" />
                    <span className="text-[8px] font-bold text-accent">AI</span>
                  </div>
                  I'll build a professional healthcare SaaS pitch. Let me create a hero, key metrics, feature comparison, pricing tiers, and a CTA...
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.0 }}
                  className="glass-card rounded-xl px-3.5 py-2.5 text-[11px] text-success mr-4"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-2 w-2 text-success" />
                    <span className="text-[8px] font-bold text-success">DONE</span>
                  </div>
                  Your pitch is ready! 8 sections generated with professional content.
                </motion.div>

                <div className="mt-auto flex items-center gap-2">
                  <div className="flex-1 rounded-lg border border-border bg-bg-card px-3 py-2 text-[10px] text-text-tertiary">
                    Ask for changes...
                  </div>
                  <div className="p-2 rounded-lg bg-accent">
                    <Send className="h-3 w-3 text-white" />
                  </div>
                </div>
              </div>

              {/* Canvas preview */}
              <div className="p-8 overflow-hidden bg-bg">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="space-y-3 max-w-[440px] mx-auto"
                >
                  {/* Hero block */}
                  <div className="rounded-xl border border-border bg-bg-card p-6 text-center">
                    <div className="text-[10px] font-bold text-accent mb-1 tracking-wider uppercase">Healthcare Platform</div>
                    <div className="text-xl font-bold mb-1">VisioHealth OS</div>
                    <div className="text-[11px] text-text-secondary">AI-Powered Practice Management for Modern Clinics</div>
                    <button className="mt-3 px-4 py-1.5 rounded-md bg-accent text-white text-[10px] font-semibold">Book a Demo</button>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { v: '47%', l: 'Less Admin' },
                      { v: '3.2x', l: 'ROI' },
                      { v: '99.9%', l: 'Uptime' },
                      { v: '$2.4M', l: 'Saved' },
                    ].map((s) => (
                      <div key={s.l} className="rounded-lg border border-border bg-bg-card p-2.5 text-center">
                        <div className="text-sm font-bold text-accent">{s.v}</div>
                        <div className="text-[8px] text-text-tertiary mt-0.5">{s.l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { n: 'Starter', p: 'R7,500', hl: false },
                      { n: 'Pro', p: 'R15,000', hl: true },
                      { n: 'Enterprise', p: 'R30,000', hl: false },
                    ].map((t) => (
                      <div key={t.n} className={`rounded-lg border p-3 text-center ${
                        t.hl ? 'border-accent bg-accent/5' : 'border-border bg-bg-card'
                      }`}>
                        <div className="text-[9px] text-text-tertiary">{t.n}</div>
                        <div className="text-sm font-bold">{t.p}</div>
                        <div className="text-[8px] text-text-tertiary">/month</div>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="rounded-lg border border-border bg-bg-card p-4 text-center">
                    <div className="text-sm font-bold mb-0.5">Ready to transform your practice?</div>
                    <div className="text-[10px] text-text-secondary">Start your free trial today</div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── How it Works ── */}
      <section className="px-6 py-24 border-t border-border">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-16">
            <span className="overline mb-3 block">How it works</span>
            <h2 className="text-3xl font-bold tracking-tight mb-3">Three steps to a winning pitch</h2>
            <p className="text-sm text-text-secondary max-w-md mx-auto">No design skills needed. Just describe what you want.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '01', icon: FileText, title: 'Describe your brief', desc: 'Tell AI about your pitch — who it\'s for, your industry, key messages, and style preferences.' },
              { step: '02', icon: Layers, title: 'AI builds it live', desc: 'Gemini AI generates a multi-section proposal with hero, metrics, pricing, team, and CTA blocks.' },
              { step: '03', icon: Share2, title: 'Share & close deals', desc: 'Export as PDF, share via link with analytics, or send directly to your client.' },
            ].map(({ step, icon: Icon, title, desc }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-bold text-accent">{step}</span>
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                </div>
                <h3 className="text-sm font-semibold mb-2">{title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid — Bento style ── */}
      <section className="px-6 py-24 border-t border-border">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-16">
            <span className="overline mb-3 block">Features</span>
            <h2 className="text-3xl font-bold tracking-tight">Everything you need to win</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Sparkles, title: 'Gemini AI', desc: 'Powered by Google\'s most capable model for intelligent pitch generation' },
              { icon: Layers, title: '12 Block Types', desc: 'Hero, metrics, pricing, team, timeline, gallery, CTA and more' },
              { icon: BarChart3, title: 'View Analytics', desc: 'Track who opens your pitch, time spent, and engagement metrics' },
              { icon: Zap, title: '12 Templates', desc: 'Industry-specific templates for SaaS, healthcare, fintech, and more' },
              { icon: Globe, title: 'Share via Link', desc: 'One-click shareable links with expiry and access controls' },
              { icon: FileText, title: 'PDF Export', desc: 'Download polished PDFs for offline presentations and email' },
              { icon: Send, title: 'Email Direct', desc: 'Send pitches directly to clients with built-in delivery tracking' },
              { icon: Lock, title: 'Secure & Private', desc: 'Your data stays yours. Enterprise-grade security with Supabase' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="card p-5 group"
              >
                <div className="h-9 w-9 rounded-lg bg-bg-hover flex items-center justify-center mb-3 group-hover:bg-accent/10 transition-colors">
                  <Icon className="h-4 w-4 text-text-secondary group-hover:text-accent transition-colors" />
                </div>
                <h3 className="text-[13px] font-semibold mb-1">{title}</h3>
                <p className="text-[11px] text-text-secondary leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="px-6 py-20 border-t border-border">
        <div className="max-w-[800px] mx-auto grid grid-cols-4 gap-8">
          {[
            { value: '12', label: 'Block Types' },
            { value: '12', label: 'Templates' },
            { value: '<30s', label: 'Generation' },
            { value: '100%', label: 'Free Tier' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-extrabold text-gradient mb-1">{stat.value}</div>
              <div className="text-[11px] text-text-tertiary">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-28 border-t border-border relative">
        <div className="absolute inset-0 aurora-bg opacity-40" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-[480px] mx-auto text-center relative"
        >
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            Ready to build your next pitch?
          </h2>
          <p className="text-sm text-text-secondary mb-8">
            Join thousands of professionals building proposals with AI.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="btn-primary py-3 px-8 text-sm"
          >
            Get Started — It's Free <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md gradient-accent flex items-center justify-center">
              <Sparkles className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-xs font-semibold">VisioPitch</span>
          </div>
          <p className="text-[10px] text-text-tertiary">
            &copy; 2026 VisioCorp. AI-powered pitch builder.
          </p>
        </div>
      </footer>
    </div>
  );
}
