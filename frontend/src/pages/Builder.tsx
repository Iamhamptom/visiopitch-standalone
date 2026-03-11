import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { pitches as pitchApi, type Pitch, type ChatResponse } from '../lib/api';
import {
  ArrowLeft, Send, Loader2, Sparkles, Check,
  Monitor, Tablet, Smartphone, Share2, Download,
  MessageSquare, Eye, Paperclip,
} from 'lucide-react';

type ViewMode = 'desktop' | 'tablet' | 'mobile';

const QUICK_ACTIONS = [
  'Create a pitch for a music marketing agency',
  'Build a healthcare SaaS proposal with pricing',
  'Design a fintech startup pitch with metrics',
  'Add a team section with bios',
  'Change the color scheme to gold and black',
];

export default function Builder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
  const templatePromptSent = useRef(false);

  // Load pitch
  useEffect(() => {
    if (!id) return;
    pitchApi.get(id).then((p) => {
      setPitch(p);
      setLoading(false);
      if (p.blocks && p.blocks.length > 0) setShowPreview(true);
    }).catch(() => navigate('/dashboard'));
  }, [id, navigate]);

  // Auto-send template prompt if coming from templates page
  useEffect(() => {
    if (!pitch || templatePromptSent.current) return;
    const prompt = searchParams.get('prompt');
    if (prompt && pitch.blocks.length === 0) {
      templatePromptSent.current = true;
      handleSend(prompt);
    }
  }, [pitch, searchParams]);

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
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <p className="text-xs text-text-tertiary">Loading pitch...</p>
      </div>
    );
  }

  const hasBlocks = pitch?.blocks && pitch.blocks.length > 0;
  const isNewPitch = !hasBlocks && chatMessages.length === 0;

  return (
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      {/* Top bar — Mobbin thin header */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 h-12 border-b border-border glass shrink-0"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-6 w-6 rounded-md gradient-accent flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm font-semibold truncate max-w-[200px]">
            {pitch?.title || 'Pitch Builder'}
          </span>
          {pitch?.status && (
            <span className="chip text-[10px] py-0.5">{pitch.status}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-bg-elevated p-0.5">
            {([
              { mode: 'desktop' as ViewMode, icon: Monitor },
              { mode: 'tablet' as ViewMode, icon: Tablet },
              { mode: 'mobile' as ViewMode, icon: Smartphone },
            ]).map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === mode
                    ? 'bg-bg-active text-text'
                    : 'text-text-tertiary hover:text-text'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>

          {/* Save status */}
          <AnimatePresence mode="wait">
            {saveStatus === 'saving' && (
              <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving...
              </motion.span>
            )}
            {saveStatus === 'saved' && (
              <motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[10px] text-success">
                <Check className="h-3 w-3" /> Saved
              </motion.span>
            )}
          </AnimatePresence>

          <div className="h-4 w-px bg-border mx-1" />

          <button className="p-1.5 rounded-lg hover:bg-bg-hover text-text-tertiary hover:text-text transition-colors" title="Export">
            <Download className="h-3.5 w-3.5" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-bg-hover text-text-tertiary hover:text-text transition-colors" title="Share">
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>

      {/* Main layout: Chat | Canvas */}
      <div className="flex flex-1 min-h-0">
        {/* Chat panel */}
        <div className="w-[400px] shrink-0 border-r border-border flex flex-col bg-bg-elevated">
          {/* Chat header */}
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg gradient-accent flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="text-xs font-semibold block">Pitch AI</span>
                <span className="text-[10px] text-text-tertiary">
                  {isNewPitch ? 'Let\'s build your pitch' : 'Describe changes or ask anything'}
                </span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Welcome state for new pitches */}
            {isNewPitch && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="py-6"
              >
                <div className="h-14 w-14 rounded-2xl bg-accent-muted flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-6 w-6 text-accent/40" />
                </div>
                <p className="text-sm font-semibold text-center mb-1">What are you pitching?</p>
                <p className="text-xs text-text-secondary text-center mb-5 max-w-[280px] mx-auto leading-relaxed">
                  Tell me about your project — who it's for, what you're proposing, and any style preferences. I'll design a stunning pitch deck.
                </p>

                <div className="space-y-2">
                  {QUICK_ACTIONS.slice(0, 3).map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSend(suggestion)}
                      className="w-full text-left card px-4 py-3 text-[11px] text-text-secondary hover:text-text transition-all"
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
                  transition={{ duration: 0.25 }}
                  className={`rounded-xl px-4 py-3 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-bg-active text-text ml-8 rounded-br-sm'
                      : 'glass-card text-text-secondary mr-4 rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="h-2.5 w-2.5 text-accent" />
                      <span className="text-[9px] font-semibold text-accent">AI</span>
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
                className="flex items-center gap-2.5 px-4 py-3 text-xs text-text-tertiary"
              >
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                Designing your pitch...
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
              <button
                type="button"
                className="p-2.5 rounded-lg hover:bg-bg-hover text-text-tertiary hover:text-text transition-colors"
                title="Attach files"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isNewPitch ? 'Describe your pitch...' : 'Ask for changes...'}
                disabled={chatLoading}
                className="flex-1 rounded-lg border border-border bg-bg-card px-4 py-2.5 text-xs text-text placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="p-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white transition-all active:scale-95 disabled:opacity-30"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 min-w-0 bg-bg overflow-auto flex justify-center p-6">
          <div className={`${viewModeWidths[viewMode]} max-w-full transition-all duration-500 ease-out`}>
            {(!showPreview || !hasBlocks) ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full text-center py-20"
              >
                <div className="h-20 w-20 rounded-2xl bg-accent-muted flex items-center justify-center mb-6">
                  <Eye className="h-8 w-8 text-accent/20" />
                </div>
                <h2 className="text-lg font-bold mb-2">Your canvas is ready</h2>
                <p className="text-sm text-text-secondary max-w-xs leading-relaxed">
                  {isNewPitch
                    ? 'Start by telling the AI about your pitch. It\'ll design it here in real-time.'
                    : 'Use the chat to add or modify content. Changes appear here instantly.'}
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-xl border border-border overflow-hidden shadow-2xl shadow-black/30 bg-bg-card glow-accent"
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
