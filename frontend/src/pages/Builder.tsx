import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { pitches as pitchApi, type Pitch, type ChatResponse } from '../lib/api';
import {
  ArrowLeft, Send, Loader2, Sparkles, Check,
  Monitor, Tablet, Smartphone, Share2, Download,
  Code2, Eye, CheckCheck,
  Copy, Maximize2, Minimize2,
} from 'lucide-react';

type ViewMode = 'desktop' | 'tablet' | 'mobile';

const QUICK_ACTIONS = [
  { label: 'SaaS Startup Pitch', prompt: 'Create a stunning pitch deck for a B2B analytics SaaS platform raising Series A. Make it look like a premium tech product — gradient hero, animated metrics, 3-tier pricing, team section, and a bold CTA.' },
  { label: 'Creative Agency Proposal', prompt: 'Design a creative agency proposal for a luxury brand rebranding project. Editorial layout, asymmetric grids, elegant typography, timeline, deliverables, and investment tiers.' },
  { label: 'Healthcare Platform', prompt: 'Create a healthcare technology pitch for an AI-powered practice management platform. Clean, trustworthy design with teal accents, proof metrics, features grid, pricing, and compliance section.' },
  { label: 'Music Label Pitch', prompt: 'Build a pitch deck for a music label partnership — dark luxury aesthetic, bold gradients, artist metrics, distribution features, revenue splits, and a signing CTA. Make it feel like LVMH meets Spotify.' },
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
  const [shareStatus, setShareStatus] = useState<'idle' | 'copying' | 'copied'>('idle');
  const [showCode, setShowCode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    }).catch(() => navigate('/dashboard'));
  }, [id, navigate]);

  // Auto-send template prompt
  useEffect(() => {
    if (!pitch || templatePromptSent.current) return;
    const prompt = searchParams.get('prompt');
    if (prompt && !pitch.html_content && pitch.blocks.length === 0) {
      templatePromptSent.current = true;
      handleSend(prompt);
    }
  }, [pitch, searchParams]);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Update iframe when html_content changes
  useEffect(() => {
    if (!pitch?.html_content || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(pitch.html_content);
      doc.close();
    }
  }, [pitch?.html_content, viewMode]);

  // Auto-save
  const triggerAutoSave = useCallback((updatedPitch?: Pitch) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const p = updatedPitch || pitch;
      if (!p || !id) return;
      setSaveStatus('saving');
      try {
        await pitchApi.update(id, {
          title: p.title,
          accent_color: p.accent_color,
          html_content: p.html_content,
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('idle');
      }
    }, 1500);
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
      triggerAutoSave(res.pitch);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'Something went wrong. Try again.'}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Share
  const handleShare = async () => {
    if (!pitch) return;
    setShareStatus('copying');
    try {
      const url = `${window.location.origin}/view/${pitch.id}`;
      await navigator.clipboard.writeText(url);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch {
      setShareStatus('idle');
    }
  };

  // Export HTML
  const handleExport = async () => {
    if (!pitch?.html_content) return;
    const blob = new Blob([pitch.html_content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pitch.title || 'pitch'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy HTML
  const handleCopyCode = async () => {
    if (!pitch?.html_content) return;
    await navigator.clipboard.writeText(pitch.html_content);
  };

  const viewModeWidths: Record<ViewMode, string> = {
    desktop: 'w-full',
    tablet: 'max-w-[768px]',
    mobile: 'max-w-[375px]',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
        <p className="text-sm text-text-tertiary">Loading pitch...</p>
      </div>
    );
  }

  const hasContent = !!pitch?.html_content;
  const isNewPitch = !hasContent && chatMessages.length === 0;

  return (
    <div className="h-screen bg-[#0C0C0E] flex flex-col overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-white/[0.06] bg-[#111113] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-white/90 truncate max-w-[200px]">
            {pitch?.title || 'Pitch Builder'}
          </span>
          {pitch?.industry && pitch.industry !== 'general' && (
            <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/[0.06]">
              {pitch.industry}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* View mode */}
          <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5 mr-2">
            {([
              { mode: 'desktop' as ViewMode, icon: Monitor },
              { mode: 'tablet' as ViewMode, icon: Tablet },
              { mode: 'mobile' as ViewMode, icon: Smartphone },
            ]).map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === mode ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/60'
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
                className="flex items-center gap-1.5 text-[11px] text-white/30 mr-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving
              </motion.span>
            )}
            {saveStatus === 'saved' && (
              <motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[11px] text-emerald-400 mr-2">
                <Check className="h-3 w-3" /> Saved
              </motion.span>
            )}
          </AnimatePresence>

          {/* Code toggle */}
          <button
            onClick={() => setShowCode(!showCode)}
            disabled={!hasContent}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-20 ${
              showCode
                ? 'bg-white/[0.08] text-white'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Code</span>
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            disabled={!hasContent}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors disabled:opacity-20"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          <div className="h-4 w-px bg-white/[0.06] mx-1" />

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={!hasContent}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors disabled:opacity-20"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Export</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            disabled={!hasContent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.1] text-white hover:bg-white/[0.15] transition-colors disabled:opacity-20"
          >
            {shareStatus === 'copied' ? (
              <><CheckCheck className="h-3.5 w-3.5" /><span>Copied!</span></>
            ) : (
              <><Share2 className="h-3.5 w-3.5" /><span className="hidden md:inline">Share</span></>
            )}
          </button>
        </div>
      </div>

      {/* ── Main: Chat | Canvas/Code ── */}
      <div className="flex flex-1 min-h-0">
        {/* Chat panel */}
        {!isFullscreen && (
          <div className="w-[380px] shrink-0 border-r border-white/[0.06] flex flex-col bg-[#111113]">
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white/90 block">VisioPitch AI</span>
                  <span className="text-[10px] text-white/30">
                    {chatLoading ? 'Generating code...' : isNewPitch ? 'Describe your pitch' : 'Ready to iterate'}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isNewPitch && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="py-4"
                >
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-6 w-6 text-indigo-400" />
                  </div>
                  <p className="text-sm font-semibold text-white/90 text-center mb-1">What are you building?</p>
                  <p className="text-[11px] text-white/40 text-center mb-5 max-w-[280px] mx-auto leading-relaxed">
                    Describe your pitch and AI will generate a complete, custom-designed page with unique layouts, animations, and styling.
                  </p>

                  <div className="space-y-2">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => handleSend(action.prompt)}
                        className="w-full text-left rounded-xl border border-white/[0.06] px-4 py-3 hover:border-white/[0.12] hover:bg-white/[0.02] transition-all group"
                      >
                        <span className="text-[12px] font-medium text-white/80 group-hover:text-white/95 block">
                          {action.label}
                        </span>
                        <span className="text-[10px] text-white/25 mt-0.5 line-clamp-1 block">
                          {action.prompt.slice(0, 80)}...
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              <AnimatePresence>
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`rounded-xl px-3.5 py-2.5 text-[12px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-white/[0.08] text-white/90 ml-8 rounded-br-sm'
                        : 'bg-white/[0.03] border border-white/[0.06] text-white/60 mr-6 rounded-bl-sm'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles className="h-2.5 w-2.5 text-indigo-400" />
                        <span className="text-[9px] font-semibold text-indigo-400 uppercase tracking-wider">AI</span>
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
                  className="flex items-center gap-3 px-4 py-4"
                >
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-white/30">Generating your pitch...</span>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/[0.06]">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={isNewPitch ? 'Describe your pitch...' : 'Ask for changes...'}
                  disabled={chatLoading}
                  className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[12px] text-white/90 placeholder:text-white/20 focus:border-white/[0.12] focus:ring-0 focus:outline-none transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="p-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white/70 transition-all active:scale-95 disabled:opacity-20"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Canvas / Code Panel ── */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#0C0C0E]">
          {showCode && hasContent ? (
            /* ── Code View ── */
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-[#111113]">
                <div className="flex items-center gap-2">
                  <Code2 className="h-3.5 w-3.5 text-white/30" />
                  <span className="text-[11px] font-medium text-white/50">HTML Source</span>
                  <span className="text-[10px] text-white/20 font-mono">
                    {((pitch?.html_content?.length || 0) / 1024).toFixed(1)}KB
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </button>
              </div>
              <pre className="flex-1 overflow-auto p-4 text-[11px] leading-[1.6] text-white/60 font-mono selection:bg-indigo-500/30">
                <code>{pitch?.html_content || ''}</code>
              </pre>
            </div>
          ) : hasContent ? (
            /* ── Live Preview (iframe) ── */
            <div className="flex-1 flex items-start justify-center overflow-auto p-4">
              <div className={`${viewModeWidths[viewMode]} mx-auto transition-all duration-300 h-full`}>
                <div className="relative h-full rounded-xl overflow-hidden border border-white/[0.06] bg-[#0A0A0F] shadow-2xl shadow-black/50">
                  <iframe
                    ref={iframeRef}
                    title="Pitch Preview"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ── Empty State ── */
            <div className="flex-1 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center max-w-md"
              >
                <div className="relative mb-8">
                  <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 flex items-center justify-center">
                    <Eye className="h-10 w-10 text-indigo-500/40" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                </div>

                <h2 className="text-xl font-bold text-white/90 mb-2">Your canvas is empty</h2>
                <p className="text-sm text-white/30 leading-relaxed mb-2">
                  {chatLoading
                    ? 'Generating your pitch — a custom-designed page will appear here...'
                    : 'Describe your pitch in the chat. AI will generate a complete, unique design — not templates, real code.'}
                </p>
                {chatLoading && (
                  <div className="mt-4 flex items-center gap-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                    <span className="text-xs text-white/30">Writing HTML & CSS...</span>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen toggle hint */}
      {isFullscreen && (
        <button
          onClick={() => setIsFullscreen(false)}
          className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-black/80 border border-white/10 text-white/50 hover:text-white/80 transition-colors backdrop-blur-sm"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
