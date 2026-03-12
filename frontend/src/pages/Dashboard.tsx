import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { pitches as pitchApi, type Pitch, system } from '../lib/api';
import {
  Sparkles, Plus, Clock, CheckCircle2,
  Send, XCircle, FileText, LogOut, Loader2,
  Trash2, Zap, LayoutTemplate, Search,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', color: 'text-text-tertiary', icon: Clock },
  review: { label: 'Review', color: 'text-warning', icon: FileText },
  sent: { label: 'Sent', color: 'text-brand', icon: Send },
  won: { label: 'Won', color: 'text-success', icon: CheckCircle2 },
  lost: { label: 'Lost', color: 'text-error', icon: XCircle },
};

const INDUSTRY_COLORS: Record<string, string> = {
  music: '#F5A623', tech: '#3B82F6', agency: '#8B5CF6', fashion: '#EC4899',
  'real-estate': '#059669', food: '#F97316', education: '#6366F1',
  healthcare: '#14B8A6', finance: '#0EA5E9', general: '#94A3B8',
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Pitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [aiStatus, setAiStatus] = useState<{ status: string; engine: string }>({ status: 'checking', engine: '' });

  useEffect(() => {
    if (!localStorage.getItem('vp_onboarded')) {
      navigate('/onboarding');
    }
  }, [navigate]);

  useEffect(() => {
    pitchApi.list().then(setItems).finally(() => setLoading(false));
    system.lmStatus().then(setAiStatus).catch(() => setAiStatus({ status: 'offline', engine: 'none' }));
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const pitch = await pitchApi.create({ title: 'Untitled Pitch' });
      navigate(`/builder/${pitch.id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this pitch?')) return;
    await pitchApi.delete(id);
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  const filtered = items.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.client_name?.toLowerCase().includes(search.toLowerCase()))
  );

  const engineLabel = aiStatus.engine === 'gemini' ? 'Gemini AI' :
    aiStatus.engine === 'lm_studio' ? 'LM Studio' :
    aiStatus.engine === 'claude' ? 'Claude AI' : 'AI Offline';

  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-text-inverted" />
            </div>
            <span className="font-semibold text-[15px]">VisioPitch</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="chip">
              {aiStatus.status === 'checking' ? (
                <Loader2 className="h-3 w-3 animate-spin text-text-tertiary" />
              ) : aiStatus.status === 'online' ? (
                <span className="h-2 w-2 rounded-full bg-success" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-error" />
              )}
              <span className="text-xs">{engineLabel}</span>
            </div>

            <div className="h-4 w-px bg-border" />

            <span className="text-sm text-text-secondary">{user?.name}</span>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-bg-card text-text-tertiary hover:text-text transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-end justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Pitches</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {items.length} pitch{items.length !== 1 ? 'es' : ''}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/templates')}
              className="btn-secondary text-sm"
            >
              <LayoutTemplate className="h-4 w-4" /> Templates
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              New Pitch
            </button>
          </div>
        </motion.div>

        {/* Search */}
        {items.length > 0 && (
          <div className="relative max-w-sm mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pitches..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border bg-bg text-sm focus:border-text focus:ring-0 outline-none transition-all"
            />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-text-tertiary mb-3" />
            <p className="text-sm text-text-tertiary">Loading pitches...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="h-16 w-16 rounded-2xl bg-bg-card flex items-center justify-center mb-6">
              <Zap className="h-7 w-7 text-text-tertiary" />
            </div>
            <h2 className="text-xl font-bold mb-2">No pitches yet</h2>
            <p className="text-sm text-text-secondary mb-8 max-w-xs leading-relaxed">
              Start from a template or create from scratch with AI.
            </p>
            <div className="flex gap-3">
              <button onClick={() => navigate('/templates')} className="btn-secondary text-sm">
                <LayoutTemplate className="h-4 w-4" /> Browse Templates
              </button>
              <button onClick={handleCreate} className="btn-primary text-sm">
                <Plus className="h-4 w-4" /> Create from Scratch
              </button>
            </div>
          </motion.div>
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            <AnimatePresence mode="popLayout">
              {filtered.map((pitch, i) => {
                const statusCfg = STATUS_CONFIG[pitch.status] || STATUS_CONFIG.draft;
                const StatusIcon = statusCfg.icon;
                const accentColor = INDUSTRY_COLORS[pitch.industry] || '#94A3B8';

                return (
                  <motion.button
                    key={pitch.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    onClick={() => navigate(`/builder/${pitch.id}`)}
                    className="group text-left rounded-2xl border border-border hover:border-border-hover bg-bg overflow-hidden transition-all hover:shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
                  >
                    {/* Accent header */}
                    <div
                      className="h-1.5 transition-all group-hover:h-2"
                      style={{ backgroundColor: accentColor }}
                    />

                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-sm font-semibold truncate pr-2">
                          {pitch.title}
                        </h3>
                        <button
                          onClick={(e) => handleDelete(pitch.id, e)}
                          className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-bg-card text-text-tertiary hover:text-error transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {pitch.client_name && (
                        <p className="text-xs text-text-secondary mb-3 truncate">
                          {pitch.client_name}
                          {pitch.client_company && ` — ${pitch.client_company}`}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className={`h-3 w-3 ${statusCfg.color}`} />
                          <span className={`text-[11px] font-medium ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <span className="text-[11px] text-text-tertiary">
                          {(pitch as any).has_html ? 'HTML' : `${(pitch.blocks || []).length} blocks`}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
