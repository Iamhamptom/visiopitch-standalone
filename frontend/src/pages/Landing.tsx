import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Shield, ArrowRight, Play, Layers, Send, Globe } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" as const } },
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2.5"
          >
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-pitch to-purple-500 flex items-center justify-center shadow-lg shadow-pitch/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">VisioPitch</span>
            <span className="text-[9px] font-medium text-pitch bg-pitch/10 px-2 py-0.5 rounded-full">BETA</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-text-muted hover:text-text transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/register')}
              className="text-sm font-semibold bg-gradient-to-r from-pitch to-purple-500 hover:from-pitch-dark hover:to-purple-600 text-white px-5 py-2 rounded-xl transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-pitch/25 active:scale-[0.98]"
            >
              Get Started Free
            </button>
          </motion.div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-24 px-6 mesh-gradient">
        {/* Ambient glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-pitch/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="inline-flex items-center gap-2 rounded-full border border-pitch/20 bg-pitch/5 px-4 py-1.5 text-xs font-medium text-pitch-light mb-8 backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pitch opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-pitch" />
            </span>
            AI-Powered Cloud Sandbox — Like Lovable, for pitches
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6"
          >
            Build pitches that
            <br />
            <span className="text-gradient">close deals</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="text-lg md:text-xl text-text-muted max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Describe your pitch in plain English. Watch AI build it live.
            Share with one click. Win the deal.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="flex items-center justify-center gap-4"
          >
            <button
              onClick={() => navigate('/register')}
              className="group flex items-center gap-2.5 bg-gradient-to-r from-pitch to-purple-500 hover:from-pitch-dark hover:to-purple-600 text-white px-7 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.03] hover:shadow-xl hover:shadow-pitch/30 active:scale-[0.98]"
            >
              Start Building Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2.5 border border-border hover:border-border-hover text-text-muted hover:text-text px-6 py-3.5 rounded-2xl text-sm transition-all hover:bg-surface-1"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Watch Demo
            </button>
          </motion.div>
        </div>
      </section>

      {/* Preview mockup */}
      <section className="px-6 pb-28 -mt-4">
        <motion.div
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-5xl mx-auto"
        >
          <div className="glow-border rounded-3xl overflow-hidden shadow-2xl shadow-black/40">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-surface-1/80 backdrop-blur border-b border-border">
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500/70" />
                <div className="h-3 w-3 rounded-full bg-amber-500/70" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 rounded-lg bg-surface-2 border border-border px-4 py-1">
                  <Globe className="h-3 w-3 text-text-subtle" />
                  <span className="text-[10px] text-text-subtle">visiopitch.app/builder</span>
                </div>
              </div>
            </div>
            {/* Builder UI */}
            <div className="grid grid-cols-[300px_1fr] h-[440px] bg-surface">
              {/* Chat panel */}
              <div className="border-r border-border p-5 flex flex-col gap-3 bg-surface-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-pitch to-purple-500 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-semibold">Pitch AI</span>
                </div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                  className="rounded-2xl rounded-bl-md bg-surface-2 p-3.5 text-xs text-text-muted leading-relaxed"
                >
                  Create a pitch for a healthcare SaaS targeting clinics in South Africa
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8 }}
                  className="rounded-2xl rounded-bl-md bg-pitch/8 border border-pitch/15 p-3.5 text-xs text-pitch-light/80 leading-relaxed"
                >
                  Building your pitch with hero, proof metrics, pricing tiers, and CTA...
                  <span className="inline-block ml-1 h-3 w-0.5 bg-pitch animate-pulse" />
                </motion.div>
                <div className="mt-auto rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-xs text-text-subtle flex items-center justify-between">
                  <span>Describe your pitch...</span>
                  <Send className="h-3.5 w-3.5 text-pitch" />
                </div>
              </div>
              {/* Canvas */}
              <div className="p-8 flex flex-col items-center justify-center gap-4 overflow-hidden">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.0 }}
                  className="w-full max-w-md space-y-3"
                >
                  <div className="rounded-2xl bg-gradient-to-br from-pitch/10 to-purple-500/5 border border-pitch/15 p-8 text-center">
                    <div className="text-xl font-bold mb-1.5">VisioHealth OS</div>
                    <div className="text-xs text-text-muted">AI-Powered Practice Management</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { value: '45%', label: 'Less Admin' },
                      { value: '3x', label: 'Faster Billing' },
                      { value: '99.9%', label: 'Uptime' },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-xl bg-surface-1 border border-border p-3 text-center">
                        <div className="text-sm font-bold text-pitch">{stat.value}</div>
                        <div className="text-[9px] text-text-subtle">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl bg-surface-1 border border-border p-4">
                    <div className="text-[10px] font-semibold text-text-subtle uppercase tracking-wider mb-2.5">Investment</div>
                    <div className="flex gap-2">
                      {[
                        { tier: 'Starter', price: 'R7,500', active: false },
                        { tier: 'Professional', price: 'R15,000', active: true },
                        { tier: 'Enterprise', price: 'R30,000', active: false },
                      ].map((plan) => (
                        <div key={plan.tier} className={`flex-1 rounded-xl p-2.5 text-center transition-all ${
                          plan.active
                            ? 'bg-pitch/10 border border-pitch/30 shadow-sm shadow-pitch/10'
                            : 'bg-surface-2 border border-transparent'
                        }`}>
                          <div className={`text-[9px] ${plan.active ? 'text-pitch-light' : 'text-text-subtle'}`}>{plan.tier}</div>
                          <div className="text-xs font-bold">{plan.price}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 py-24 border-t border-border relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to <span className="text-gradient">win</span>
            </h2>
            <p className="text-text-muted max-w-lg mx-auto">
              From AI generation to live preview to one-click sharing — VisioPitch handles the entire pitch workflow.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Sparkles, title: 'AI-Powered', desc: 'Describe your pitch, AI builds it. Hero, metrics, pricing — everything.' },
              { icon: Layers, title: 'Cloud Sandbox', desc: 'Live preview in a sandboxed environment. See changes instantly.' },
              { icon: Shield, title: 'Dual AI Engine', desc: 'Local LM Studio for privacy, Claude for power. Auto-fallback.' },
              { icon: Zap, title: 'One-Click Share', desc: 'Share pitches via link. Track views, get analytics, close deals.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i + 1}
                className="group rounded-2xl border border-border bg-surface-1 p-6 hover:border-pitch/30 transition-all duration-300 hover:shadow-lg hover:shadow-pitch/5"
              >
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-pitch/15 to-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="h-5 w-5 text-pitch" />
                </div>
                <h3 className="font-semibold text-sm mb-2">{title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-20 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8">
            {[
              { value: '12', label: 'Block Types' },
              { value: '10', label: 'Industry Templates' },
              { value: '<2min', label: 'To First Pitch' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="text-center"
              >
                <div className="text-4xl font-extrabold text-gradient mb-2">{stat.value}</div>
                <div className="text-xs text-text-muted">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 border-t border-border mesh-gradient relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-pitch/3 to-transparent pointer-events-none" />
        <motion.div
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center relative"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to build your next pitch?
          </h2>
          <p className="text-text-muted mb-8 max-w-md mx-auto">
            Join the future of proposal building. AI-powered, cloud-sandboxed, beautifully designed.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="group inline-flex items-center gap-2.5 bg-gradient-to-r from-pitch to-purple-500 hover:from-pitch-dark hover:to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold transition-all hover:scale-[1.03] hover:shadow-xl hover:shadow-pitch/30 active:scale-[0.98]"
          >
            Get Started — It's Free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-pitch to-purple-500 flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span className="text-xs font-semibold">VisioPitch</span>
          </div>
          <p className="text-[10px] text-text-subtle">
            Built by VisioCorp — AI-powered pitch builder
          </p>
        </div>
      </footer>
    </div>
  );
}
