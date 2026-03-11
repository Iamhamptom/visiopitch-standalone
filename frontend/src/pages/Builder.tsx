import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pitches as pitchApi, Pitch, ChatResponse } from '../lib/api';
import {
  ArrowLeft, Send, Loader2, Sparkles, Save, Check,
  Monitor, Tablet, Smartphone, Share2, Download, BarChart3,
} from 'lucide-react';

type ViewMode = 'desktop' | 'tablet' | 'mobile';

export default function Builder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load pitch
  useEffect(() => {
    if (!id) return;
    pitchApi.get(id).then((p) => {
      setPitch(p);
      setLoading(false);
    }).catch(() => {
      navigate('/dashboard');
    });
  }, [id, navigate]);

  // Update iframe preview whenever pitch changes
  useEffect(() => {
    if (!pitch || !iframeRef.current) return;
    fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pitch),
    })
      .then((r) => r.text())
      .then((html) => {
        const iframe = iframeRef.current;
        if (iframe) {
          iframe.srcdoc = html;
        }
      })
      .catch(() => {});
  }, [pitch]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Auto-save
  const triggerAutoSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!pitch || !id) return;
      setSaveStatus('saving');
      try {
        await pitchApi.update(id, {
          blocks: pitch.blocks,
          title: pitch.title,
          accent_color: pitch.accent_color,
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('idle');
      }
    }, 2000);
  }, [pitch, id]);

  // Chat
  const handleSend = async () => {
    if (!chatInput.trim() || !id || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    try {
      const res: ChatResponse = await pitchApi.chat(id, userMsg);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.message }]);
      setPitch(res.pitch);
      triggerAutoSave();
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'Failed to get response'}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const viewModeWidths: Record<ViewMode, string> = {
    desktop: 'w-full',
    tablet: 'w-[768px]',
    mobile: 'w-[375px]',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-pitch" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-surface flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-border bg-surface-1/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-text-subtle hover:text-text transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold truncate max-w-[200px]">
            {pitch?.title || 'Pitch Builder'}
          </span>
          {pitch?.status && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-text-subtle capitalize">
              {pitch.status}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode */}
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5">
            {([
              { mode: 'desktop' as ViewMode, icon: Monitor },
              { mode: 'tablet' as ViewMode, icon: Tablet },
              { mode: 'mobile' as ViewMode, icon: Smartphone },
            ]).map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === mode ? 'bg-surface-3 text-text' : 'text-text-subtle hover:text-text'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>

          {/* Save status */}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-[10px] text-text-subtle">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}

          <div className="h-4 w-px bg-border mx-1" />

          <button className="p-1.5 rounded-lg hover:bg-surface-2 text-text-subtle hover:text-text transition-colors">
            <Download className="h-3.5 w-3.5" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-surface-2 text-text-subtle hover:text-text transition-colors">
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main layout: Chat | Canvas */}
      <div className="flex flex-1 min-h-0">
        {/* Chat panel */}
        <div className="w-[360px] shrink-0 border-r border-border flex flex-col bg-surface-1">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-pitch" />
              <span className="text-xs font-semibold">Pitch AI</span>
            </div>
            <p className="text-[10px] text-text-subtle mt-1">
              Describe what you want to build — the AI will generate and edit your pitch.
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="h-8 w-8 text-text-subtle/20 mx-auto mb-3" />
                <p className="text-xs text-text-subtle mb-4">Start a conversation to build your pitch</p>
                <div className="space-y-2">
                  {[
                    'Create a pitch for a healthcare SaaS',
                    'Build a proposal for a music marketing agency',
                    'Design a pitch for a fintech startup',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => { setChatInput(suggestion); }}
                      className="w-full text-left rounded-xl border border-border bg-surface-2 hover:border-border-hover px-3 py-2.5 text-[11px] text-text-muted hover:text-text transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-surface-3 text-text ml-8'
                    : 'bg-pitch/8 border border-pitch/15 text-text-muted mr-4'
                }`}
              >
                {msg.content}
              </div>
            ))}

            {chatLoading && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 text-xs text-text-subtle">
                <Loader2 className="h-3 w-3 animate-spin" />
                Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Describe your pitch..."
                disabled={chatLoading}
                className="flex-1 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-xs text-text placeholder:text-text-subtle focus:border-pitch focus:outline-none transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="p-2.5 rounded-xl bg-pitch hover:bg-pitch-dark text-white transition-colors disabled:opacity-30"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Canvas — sandboxed iframe */}
        <div className="flex-1 min-w-0 bg-surface overflow-auto flex justify-center p-6">
          <div className={`${viewModeWidths[viewMode]} max-w-full transition-all duration-300`}>
            {(!pitch?.blocks || pitch.blocks.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className="h-20 w-20 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-6">
                  <Sparkles className="h-8 w-8 text-text-subtle/20" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Your canvas is empty</h2>
                <p className="text-sm text-text-muted max-w-xs">
                  Use the AI chat to generate your pitch, or describe what you need.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border overflow-hidden shadow-2xl shadow-black/30 bg-surface">
                <iframe
                  ref={iframeRef}
                  title="Pitch Preview"
                  className="w-full min-h-[600px] border-0"
                  sandbox="allow-same-origin"
                  style={{ height: '100%' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
