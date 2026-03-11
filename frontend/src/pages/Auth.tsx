import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';

export default function Auth() {
  const location = useLocation();
  const isRegister = location.pathname === '/register';
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, name, password);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Left — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[360px]"
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="h-9 w-9 rounded-lg gradient-accent flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-[15px]">VisioPitch</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-1">
            {isRegister ? 'Create an account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-text-secondary mb-8">
            {isRegister
              ? 'Start building proposals that close deals.'
              : 'Sign in to continue building.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Hampton"
                  required
                  className="input-minimal"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="input-minimal"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
                className="input-minimal"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-error/10 border border-error/20 px-4 py-2.5 text-xs text-error"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-3 text-sm disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isRegister ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate(isRegister ? '/login' : '/register')}
              className="text-xs text-text-tertiary hover:text-text transition-colors"
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Right — Branding panel */}
      <div className="hidden lg:flex w-[480px] aurora-bg border-l border-border flex-col items-center justify-center p-12">
        <div className="max-w-[280px] text-center">
          <div className="h-16 w-16 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-6 animate-float">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-3">AI-powered proposals</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-8">
            Describe your pitch. AI designs it. Share with one click.
            Built for professionals who close deals.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: '12', l: 'Templates' },
              { v: '<30s', l: 'To Generate' },
              { v: '12', l: 'Block Types' },
              { v: 'Free', l: 'To Start' },
            ].map((s) => (
              <div key={s.l} className="card p-3 text-center">
                <div className="text-sm font-bold text-accent">{s.v}</div>
                <div className="text-[10px] text-text-tertiary">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
