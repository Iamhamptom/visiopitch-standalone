import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { pitches as pitchApi, type Pitch, system } from '../lib/api';
import {
  Sparkles, Plus, Clock, CheckCircle2,
  Send, XCircle, FileText, LogOut, Loader2, Wifi, WifiOff,
  Trash2,
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
    <div className="min-h-screen bg-surface">
      {/* Top bar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-pitch flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm">VisioPitch</span>
          </div>
          <div className="flex items-center gap-4">
            {/* LM Studio status */}
            <div className="flex items-center gap-1.5">
              {lmStatus === 'checking' ? (
                <Loader2 className="h-3 w-3 animate-spin text-text-subtle" />
              ) : lmStatus === 'online' ? (
                <Wifi className="h-3 w-3 text-emerald-400" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-400" />
              )}
              <span className="text-[10px] text-text-subtle">
                {lmStatus === 'checking' ? 'Checking...' : lmStatus === 'online' ? (aiEngine === 'claude' ? 'Claude' : 'LM Studio') : 'AI offline'}
              </span>
            </div>

            <div className="h-4 w-px bg-border" />

            <span className="text-xs text-text-muted">{user?.name}</span>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-text-subtle hover:text-text transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Pitches</h1>
            <p className="text-sm text-text-muted mt-1">
              {items.length} pitch{items.length !== 1 ? 'es' : ''}
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 bg-pitch hover:bg-pitch-dark text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105 disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New Pitch
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-text-subtle" />
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4">
              <FileText className="h-7 w-7 text-text-subtle" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No pitches yet</h2>
            <p className="text-sm text-text-muted mb-6 max-w-xs">
              Create your first pitch and let AI help you build a winning proposal.
            </p>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 bg-pitch hover:bg-pitch-dark text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Your First Pitch
            </button>
          </div>
        )}

        {/* Grid */}
        {!loading && items.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((pitch) => {
              const statusCfg = STATUS_CONFIG[pitch.status] || STATUS_CONFIG.draft;
              const StatusIcon = statusCfg.icon;
              const accentColor = INDUSTRY_COLORS[pitch.industry] || '#6B7280';

              return (
                <button
                  key={pitch.id}
                  onClick={() => navigate(`/builder/${pitch.id}`)}
                  className="group text-left rounded-2xl border border-border bg-surface-1 hover:border-border-hover overflow-hidden transition-all hover:shadow-lg hover:shadow-black/20"
                >
                  {/* Accent bar */}
                  <div className="h-1" style={{ backgroundColor: accentColor }} />

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-sm font-semibold truncate pr-2">{pitch.title}</h3>
                      <button
                        onClick={(e) => handleDelete(pitch.id, e)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-3 text-text-subtle hover:text-red-400 transition-all"
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
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
