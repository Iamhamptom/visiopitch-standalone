import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { pitches as pitchApi, type Pitch, system } from '../lib/api';
import {
  Sparkles, Plus, Clock, CheckCircle2,
  Send, XCircle, FileText, LogOut, Loader2,
  Trash2, Zap,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', color: 'text-zinc-400', icon: Clock },
  review: { label: 'Review', color: 'text-amber-400', icon: FileText },
  sent: { label: 'Sent', color: 'text-blue-400', icon: Send },
  won: { label: 'Won', color: 'text-emerald-400', icon: CheckCircle2 },
  lost: { label: 'Lost', color: 'text-red-400', icon: XCircle },
};

const INDUSTRY_COLORS: Record<string, string> = {
  music: '#D4A847', tech: '#3B82F6', agency: '#8B5CF6', fashion: '#EC4899',
  'real-estate': '#059669', food: '#F97316', education: '#6366F1',
  healthcare: '#14B8A6', finance: '#0EA5E9', general: '#6B7280',
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: "easeOut" as const },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Pitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [lmStatus, setLmStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [aiEngine, setAiEngine] = useState<string>('');

  useEffect(() => {
    pitchApi.list().then(setItems).finally(() => setLoading(false));
    system.lmStatus().then((s) => {
      setLmStatus(s.status as 'online' | 'offline');
      setAiEngine(s.engine || '');
    }).catch(() => setLmStatus('offline'));
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

  return (
    <div className="min-h-screen bg-surface mesh-gradient">
      {/* Top bar */}
      <nav className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-pitch to-purple-500 flex items-center justify-center shadow-lg shadow-pitch/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm">VisioPitch</span>
          </div>
          <div className="flex items-center gap-4">
            {/* AI status */}
            <div className="flex items-center gap-2 rounded-full bg-surface-2 border border-border px-3 py-1">
              {lmStatus === 'checking' ? (
                <Loader2 className="h-3 w-3 animate-spin text-text-subtle" />
              ) : lmStatus === 'online' ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
              ) : (
                <span className="h-2 w-2 rounded-full bg-red-400" />
              )}
              <span className="text-[10px] text-text-subtle font-medium">
                {lmStatus === 'checking' ? 'Connecting...' : lmStatus === 'online' ? (aiEngine === 'claude' ? 'Claude AI' : 'LM Studio') : 'AI Offline'}
              </span>
            </div>

            <div className="h-4 w-px bg-border" />

            <span className="text-xs text-text-muted">{user?.name}</span>
            <button
              onClick={logout}
              className="p-2 rounded-xl hover:bg-surface-2 text-text-subtle hover:text-text transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Pitches</h1>
            <p className="text-sm text-text-muted mt-1">
              {items.length} pitch{items.length !== 1 ? 'es' : ''}
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="group flex items-center gap-2 bg-gradient-to-r from-pitch to-purple-500 hover:from-pitch-dark hover:to-purple-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-pitch/25 active:scale-[0.98] disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New Pitch
          </button>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-12 w-12 rounded-2xl bg-surface-1 border border-border flex items-center justify-center mb-4">
              <Loader2 className="h-5 w-5 animate-spin text-pitch" />
            </div>
            <p className="text-xs text-text-subtle">Loading your pitches...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-pitch/10 to-purple-500/5 border border-pitch/15 flex items-center justify-center mb-6">
              <Zap className="h-8 w-8 text-pitch/40" />
            </div>
            <h2 className="text-xl font-bold mb-2">No pitches yet</h2>
            <p className="text-sm text-text-muted mb-8 max-w-xs leading-relaxed">
              Create your first pitch and let AI build a winning proposal in seconds.
            </p>
            <button
              onClick={handleCreate}
              className="group flex items-center gap-2.5 bg-gradient-to-r from-pitch to-purple-500 text-white px-6 py-3 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-pitch/25"
            >
              <Plus className="h-4 w-4" />
              Create Your First Pitch
            </button>
          </motion.div>
        )}

        {/* Grid */}
        {!loading && items.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {items.map((pitch, i) => {
                const statusCfg = STATUS_CONFIG[pitch.status] || STATUS_CONFIG.draft;
                const StatusIcon = statusCfg.icon;
                const accentColor = INDUSTRY_COLORS[pitch.industry] || '#6B7280';

                return (
                  <motion.button
                    key={pitch.id}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    custom={i}
                    onClick={() => navigate(`/builder/${pitch.id}`)}
                    className="group text-left rounded-2xl border border-border bg-surface-1 hover:border-border-hover overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5"
                  >
                    {/* Accent bar */}
                    <div className="h-1 transition-all duration-300 group-hover:h-1.5" style={{ backgroundColor: accentColor }} />

                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-sm font-semibold truncate pr-2">{pitch.title}</h3>
                        <button
                          onClick={(e) => handleDelete(pitch.id, e)}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-surface-3 text-text-subtle hover:text-red-400 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {pitch.client_name && (
                        <p className="text-xs text-text-muted mb-3 truncate">
                          {pitch.client_name}
                          {pitch.client_company && ` — ${pitch.client_company}`}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className={`h-3 w-3 ${statusCfg.color}`} />
                          <span className={`text-[10px] font-medium ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-text-subtle">
                          {pitch.blocks.length} blocks
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
