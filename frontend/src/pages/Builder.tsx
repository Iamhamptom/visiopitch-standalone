import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { pitches as pitchApi, type Pitch, type ChatResponse } from '../lib/api';
import {
  ArrowLeft, Send, Loader2, Sparkles, Check,
  Monitor, Tablet, Smartphone, Share2, Download,
  Zap, Eye,
} from 'lucide-react';

type ViewMode = 'desktop' | 'tablet' | 'mobile';

const SUGGESTIONS = [
  'Create a pitch for a music marketing agency',
  'Build a healthcare SaaS proposal with pricing tiers',
  'Design a fintech startup pitch with proof metrics',
  'Add a team section with 4 members',
  'Change the accent color to gold',
];

export default function Builder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showPreview, setShowPreview] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load pitch
  useEffect(() => {
    if (!id) return;
    pitchApi.get(id).then((p) => {
      setPitch(p);
      setLoading(false);
      if (p.blocks && p.blocks.length > 0) setShowPreview(true);
    }).catch(() => navigate('/dashboard'));
  }, [id, navigate]);

  // Update iframe preview
  useEffect(() => {
    if (!pitch || !iframeRef.current) return;
    fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pitch),
    })
      .then((r) => r.text())
      .then((html) => {
        if (iframeRef.current) iframeRef.current.srcdoc = html;
      })
      .catch(() => {});
  }, [pitch]);

  // Scroll chat
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
        await pitchApi.update(id, { blocks: pitch.blocks, title: pitch.title, accent_color: pitch.accent_color });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('idle');
      }
    }, 2000);
  }, [pitch, id]);

  // Chat
  const handleSend = async (customMessage?: string) => {
    const msg = customMessage || chatInput.trim();
    if (!msg || !id || chatLoading) return;

    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);

    try {
      const res: ChatResponse = await pitchApi.chat(id, msg);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.message }]);
      setPitch(res.pitch);
      setShowPreview(true);
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
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pitch/15 to-purple-500/10 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-pitch" />
        </div>
        <p className="text-xs text-text-subtle">Loading your pitch...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-surface flex flex-col overflow-hidden">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 h-12 border-b border-border glass shrink-0"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 rounded-xl hover:bg-surface-2 text-text-subtle hover:text-text transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-pitch to-purple-500 flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm font-semibold truncate max-w-[200px]">
            {pitch?.title || 'Pitch Builder'}
          </span>
          {pitch?.status && (
            <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-border text-text-subtle capitalize font-medium">
              {pitch.status}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode */}
          <div className="flex items-center gap-0.5 rounded-xl border border-border bg-surface-2 p-0.5">
            {([
              { mode: 'desktop' as ViewMode, icon: Monitor },
              { mode: 'tablet' as ViewMode, icon: Tablet },
              { mode: 'mobile' as ViewMode, icon: Smartphone },
            ]).map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === mode
                    ? 'bg-surface-3 text-text shadow-sm'
                    : 'text-text-subtle hover:text-text'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>

          {/* Save status */}
          <AnimatePresence mode="wait">
            {saveStatus === 'saving' && (
              <motion.span
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[10px] text-text-subtle"
              >
                <Loader2 className="h-3 w-3 animate-spin" /> Saving...
              </motion.span>
            )}
            {saveStatus === 'saved' && (
              <motion.span
                key="saved"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[10px] text-emerald-400"
              >
                <Check className="h-3 w-3" /> Saved
              </motion.span>
            )}
          </AnimatePresence>

          <div className="h-4 w-px bg-border mx-1" />

          <button className="p-1.5 rounded-xl hover:bg-surface-2 text-text-subtle hover:text-text transition-colors" title="Export">
            <Download className="h-3.5 w-3.5" />
          </button>
          <button className="p-1.5 rounded-xl hover:bg-surface-2 text-text-subtle hover:text-text transition-colors" title="Share">
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>

      {/* Main layout: Chat | Canvas */}
      <div className="flex flex-1 min-h-0">
        {/* Chat panel */}
        <div className="w-[380px] shrink-0 border-r border-border flex flex-col bg-surface-1">
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-pitch to-purple-500 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <span className="text-xs font-semibold">Pitch AI</span>
                <span className="block text-[10px] text-text-subtle">Describe what you want to build</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center py-8"
              >
                <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-pitch/10 to-purple-500/5 border border-pitch/10 flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-7 w-7 text-pitch/30" />
                </div>
                <p className="text-sm font-medium mb-1">What would you like to build?</p>
                <p className="text-xs text-text-subtle mb-5">Try one of these prompts</p>
                <div className="space-y-2">
                  {SUGGESTIONS.slice(0, 3).map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSend(suggestion)}
                      className="w-full text-left rounded-xl border border-border bg-surface-2 hover:border-pitch/20 hover:bg-surface-3 px-4 py-3 text-[11px] text-text-muted hover:text-text transition-all duration-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-surface-3 text-text ml-8 rounded-br-md'
                      : 'bg-pitch/6 border border-pitch/10 text-text-muted mr-4 rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="h-2.5 w-2.5 text-pitch" />
                      <span className="text-[9px] font-semibold text-pitch">AI</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </motion.div>
              ))}
            </AnimatePresence>

            {chatLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2.5 px-4 py-3 text-xs text-text-subtle"
              >
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-pitch animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-pitch animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-pitch animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                Generating your pitch...
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
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
                className="flex-1 rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs text-text placeholder:text-text-subtle focus:border-pitch focus:ring-1 focus:ring-pitch/30 focus:outline-none transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="p-3 rounded-xl bg-gradient-to-r from-pitch to-purple-500 hover:from-pitch-dark hover:to-purple-600 text-white transition-all hover:shadow-lg hover:shadow-pitch/25 active:scale-95 disabled:opacity-30 disabled:hover:shadow-none"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 min-w-0 bg-surface overflow-auto flex justify-center p-6">
          <div className={`${viewModeWidths[viewMode]} max-w-full transition-all duration-500 ease-out`}>
            {(!showPreview || !pitch?.blocks || pitch.blocks.length === 0) ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full text-center py-20"
              >
                <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-pitch/8 to-purple-500/5 border border-pitch/10 flex items-center justify-center mb-6">
                  <Eye className="h-10 w-10 text-pitch/20" />
                </div>
                <h2 className="text-xl font-bold mb-2">Your canvas is ready</h2>
                <p className="text-sm text-text-muted max-w-xs leading-relaxed">
                  Use the AI chat to generate your pitch. It'll appear here in real-time.
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl border border-border overflow-hidden shadow-2xl shadow-black/30 bg-surface glow-pitch"
              >
                <iframe
                  ref={iframeRef}
                  title="Pitch Preview"
                  className="w-full border-0"
                  sandbox="allow-same-origin"
                  style={{ height: '80vh' }}
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
