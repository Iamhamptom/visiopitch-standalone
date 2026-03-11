import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Sparkles, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-pitch flex items-center justify-center">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">VisioPitch</span>
        </div>

        <div className="rounded-2xl border border-border bg-surface-1 p-6">
          <h1 className="text-lg font-bold mb-1">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-xs text-text-muted mb-6">
            {isRegister
              ? 'Start building pitches that close deals'
              : 'Sign in to your VisioPitch account'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Hampton"
                  required
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:border-pitch focus:outline-none transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:border-pitch focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:border-pitch focus:outline-none transition-colors"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-pitch hover:bg-pitch-dark text-white font-semibold text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRegister ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate(isRegister ? '/login' : '/register')}
              className="text-xs text-text-muted hover:text-pitch transition-colors"
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
