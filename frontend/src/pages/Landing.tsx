import { useNavigate } from 'react-router-dom';
import { Sparkles, Zap, Shield, ArrowRight, Play } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border bg-surface/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-pitch flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">VisioPitch</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-text-muted hover:text-text transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/register')}
              className="text-sm font-medium bg-pitch hover:bg-pitch-dark text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-pitch/20 bg-pitch/5 px-4 py-1.5 text-xs font-medium text-pitch-light mb-8">
            <Zap className="h-3 w-3" />
            Powered by Local AI — Your data stays on your machine
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Build pitches that
            <br />
            <span className="bg-gradient-to-r from-pitch to-pitch-light bg-clip-text text-transparent">
              close deals
            </span>
          </h1>

          <p className="text-lg text-text-muted max-w-xl mx-auto mb-10 leading-relaxed">
            AI-powered pitch deck builder with local LLM inference.
            Create stunning proposals in minutes — no cloud, no data leaks,
            full control.
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="flex items-center gap-2 bg-pitch hover:bg-pitch-dark text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
            >
              Start Building
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 border border-border hover:border-border-hover text-text-muted hover:text-text px-6 py-3 rounded-xl text-sm transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Preview mockup */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden shadow-2xl shadow-pitch/5">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-[10px] text-text-subtle ml-2">VisioPitch Builder</span>
            </div>
            <div className="grid grid-cols-[280px_1fr] h-[400px]">
              {/* Chat mockup */}
              <div className="border-r border-border p-4 flex flex-col gap-3">
                <div className="text-xs font-semibold text-text-muted mb-2">AI Chat</div>
                <div className="rounded-xl bg-surface-2 p-3 text-xs text-text-muted">
                  Create a pitch for a healthcare SaaS product targeting clinics in South Africa
                </div>
                <div className="rounded-xl bg-pitch/10 border border-pitch/20 p-3 text-xs text-pitch-light">
                  I'll create a healthcare-focused pitch with pricing tiers, team section, and proof metrics...
                </div>
                <div className="mt-auto rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text-subtle">
                  Type your message...
                </div>
              </div>
              {/* Canvas mockup */}
              <div className="p-6 flex flex-col items-center justify-center gap-4 bg-surface">
                <div className="w-full max-w-md space-y-3">
                  <div className="rounded-xl bg-pitch/5 border border-pitch/10 p-6 text-center">
                    <div className="text-lg font-bold mb-1">VisioHealth OS</div>
                    <div className="text-xs text-text-muted">AI-Powered Practice Management</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-surface-2 border border-border p-3 text-center">
                      <div className="text-sm font-bold text-pitch">45%</div>
                      <div className="text-[9px] text-text-subtle">Less Admin</div>
                    </div>
                    <div className="rounded-lg bg-surface-2 border border-border p-3 text-center">
                      <div className="text-sm font-bold text-pitch">3x</div>
                      <div className="text-[9px] text-text-subtle">Faster Billing</div>
                    </div>
                    <div className="rounded-lg bg-surface-2 border border-border p-3 text-center">
                      <div className="text-sm font-bold text-pitch">99.9%</div>
                      <div className="text-[9px] text-text-subtle">Uptime</div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-surface-2 border border-border p-4">
                    <div className="text-xs font-semibold mb-2">Investment</div>
                    <div className="flex gap-2">
                      <div className="flex-1 rounded-lg bg-surface p-2 text-center">
                        <div className="text-[10px] text-text-subtle">Starter</div>
                        <div className="text-xs font-bold">R7,500</div>
                      </div>
                      <div className="flex-1 rounded-lg bg-pitch/10 border border-pitch/30 p-2 text-center">
                        <div className="text-[10px] text-pitch-light">Pro</div>
                        <div className="text-xs font-bold">R15,000</div>
                      </div>
                      <div className="flex-1 rounded-lg bg-surface p-2 text-center">
                        <div className="text-[10px] text-text-subtle">Enterprise</div>
                        <div className="text-xs font-bold">R30,000</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">
            Everything you need to close
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Sparkles,
                title: 'AI-Powered',
                desc: 'Local LLM generates pitch content, pricing, team sections — from a single prompt.',
              },
              {
                icon: Shield,
                title: 'Private & Local',
                desc: 'LM Studio runs on your machine. Your pitch data never leaves your laptop.',
              },
              {
                icon: Zap,
                title: 'Instant Preview',
                desc: 'Sandboxed live preview updates as you edit. Export to PDF or share via link.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-surface-1 p-6 hover:border-border-hover transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-pitch/10 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-pitch" />
                </div>
                <h3 className="font-semibold text-sm mb-2">{title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="h-5 w-5 rounded bg-pitch flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="text-xs font-semibold">VisioPitch</span>
        </div>
        <p className="text-[10px] text-text-subtle">
          Built by VisioCorp. Local-first AI pitch builder.
        </p>
      </footer>
    </div>
  );
}
