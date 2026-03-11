import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { pitches as pitchApi, type Pitch, type ChatResponse } from '../lib/api';
import BlockRenderer from '../components/pitch/BlockRenderer';
import BlockInspector from '../components/pitch/BlockInspector';
import {
  ArrowLeft, Send, Loader2, Sparkles, Check,
  Monitor, Tablet, Smartphone, Share2, Download,
  MessageSquare, Palette, CheckCheck,
  PanelRightClose, PanelRightOpen,
  GripVertical, Plus,
} from 'lucide-react';

type ViewMode = 'desktop' | 'tablet' | 'mobile';

const QUICK_ACTIONS = [
  { label: 'SaaS Startup Pitch', prompt: 'Create a SaaS startup pitch for a B2B analytics platform raising Series A. Include hero, metrics, features, pricing, team, and CTA.' },
  { label: 'Agency Proposal', prompt: 'Create a creative agency proposal for a rebranding project. Include hero, story, deliverables, timeline, pricing tiers, team, and CTA.' },
  { label: 'Healthcare Platform', prompt: 'Create a healthcare technology pitch for a practice management platform targeting clinics in South Africa. Include hero, proof metrics, features, pricing, team, and CTA.' },
  { label: 'Fintech Pitch', prompt: 'Create a fintech startup pitch for a mobile payments platform in Africa. Include hero, problem statement, features, growth metrics, pricing, team, and investor CTA.' },
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
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [showInspector, setShowInspector] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copying' | 'copied'>('idle');
  const [accentColor, setAccentColor] = useState('#6366F1');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const templatePromptSent = useRef(false);

  // Load pitch
  useEffect(() => {
    if (!id) return;
    pitchApi.get(id).then((p) => {
      setPitch(p);
      setAccentColor(p.accent_color || '#6366F1');
      setLoading(false);
    }).catch(() => navigate('/dashboard'));
  }, [id, navigate]);

  // Auto-send template prompt
  useEffect(() => {
    if (!pitch || templatePromptSent.current) return;
    const prompt = searchParams.get('prompt');
    if (prompt && pitch.blocks.length === 0) {
      templatePromptSent.current = true;
      handleSend(prompt);
    }
  }, [pitch, searchParams]);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Auto-save
  const triggerAutoSave = useCallback((updatedPitch?: Pitch) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const p = updatedPitch || pitch;
      if (!p || !id) return;
      setSaveStatus('saving');
      try {
        await pitchApi.update(id, { blocks: p.blocks, title: p.title, accent_color: p.accent_color });
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
      setAccentColor(res.pitch.accent_color || accentColor);
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

  // Block operations
  const handleBlockUpdate = (index: number, props: Record<string, any>) => {
    if (!pitch) return;
    const blocks = [...pitch.blocks];
    blocks[index] = { ...blocks[index], props };
    const updated = { ...pitch, blocks };
    setPitch(updated);
    triggerAutoSave(updated);
  };

  const handleBlockMove = (index: number, direction: 'up' | 'down') => {
    if (!pitch) return;
    const blocks = [...pitch.blocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    [blocks[index], blocks[newIndex]] = [blocks[newIndex], blocks[index]];
    const updated = { ...pitch, blocks };
    setPitch(updated);
    setSelectedBlockIndex(newIndex);
    triggerAutoSave(updated);
  };

  const handleBlockDelete = (index: number) => {
    if (!pitch) return;
    const blocks = pitch.blocks.filter((_, i) => i !== index);
    const updated = { ...pitch, blocks };
    setPitch(updated);
    setSelectedBlockIndex(null);
    setShowInspector(false);
    triggerAutoSave(updated);
  };

  const handleBlockDuplicate = (index: number) => {
    if (!pitch) return;
    const blocks = [...pitch.blocks];
    const dup = { ...blocks[index], id: crypto.randomUUID(), props: { ...blocks[index].props } };
    blocks.splice(index + 1, 0, dup);
    const updated = { ...pitch, blocks };
    setPitch(updated);
    setSelectedBlockIndex(index + 1);
    triggerAutoSave(updated);
  };

  const handleBlockToggleVisibility = (index: number) => {
    if (!pitch) return;
    const blocks = [...pitch.blocks];
    blocks[index] = { ...blocks[index], visible: !blocks[index].visible };
    const updated = { ...pitch, blocks };
    setPitch(updated);
    triggerAutoSave(updated);
  };

  const selectBlock = (index: number) => {
    setSelectedBlockIndex(index);
    setShowInspector(true);
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

  // Export
  const handleExport = async () => {
    if (!pitch) return;
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pitch),
      });
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pitch.title || 'pitch'}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent fail
    }
  };

  // Color change
  const handleAccentChange = (color: string) => {
    if (!pitch) return;
    setAccentColor(color);
    const updated = { ...pitch, accent_color: color };
    setPitch(updated);
    triggerAutoSave(updated);
  };

  const viewModeWidths: Record<ViewMode, string> = {
    desktop: 'max-w-[900px]',
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

  const hasBlocks = pitch?.blocks && pitch.blocks.length > 0;
  const isNewPitch = !hasBlocks && chatMessages.length === 0;
  const selectedBlock = selectedBlockIndex !== null && pitch?.blocks[selectedBlockIndex] ? pitch.blocks[selectedBlockIndex] : null;

  return (
    <div className="h-screen bg-bg-elevated flex flex-col overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-border bg-bg shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 rounded-lg hover:bg-bg-card text-text-secondary hover:text-text transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-6 w-6 rounded-md bg-accent flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-text-inverted" />
          </div>
          <span className="text-sm font-semibold truncate max-w-[200px]">
            {pitch?.title || 'Pitch Builder'}
          </span>
          {pitch?.status && (
            <span className="chip text-[10px] py-0.5">{pitch.status}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* View mode */}
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-bg p-0.5">
            {([
              { mode: 'desktop' as ViewMode, icon: Monitor },
              { mode: 'tablet' as ViewMode, icon: Tablet },
              { mode: 'mobile' as ViewMode, icon: Smartphone },
            ]).map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === mode ? 'bg-bg-card text-text' : 'text-text-tertiary hover:text-text'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>

          {/* Accent color picker */}
          <div className="flex items-center gap-1 ml-2">
            <Palette className="h-3.5 w-3.5 text-text-tertiary" />
            <input
              type="color"
              value={accentColor}
              onChange={(e) => handleAccentChange(e.target.value)}
              className="w-6 h-6 rounded-md border border-border cursor-pointer bg-transparent"
              title="Accent color"
            />
          </div>

          {/* Save status */}
          <AnimatePresence mode="wait">
            {saveStatus === 'saving' && (
              <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[11px] text-text-tertiary ml-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving
              </motion.span>
            )}
            {saveStatus === 'saved' && (
              <motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[11px] text-success ml-2">
                <Check className="h-3 w-3" /> Saved
              </motion.span>
            )}
          </AnimatePresence>

          <div className="h-4 w-px bg-border mx-1.5" />

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={!hasBlocks}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-bg-card text-text-secondary hover:text-text transition-colors disabled:opacity-30"
            title="Download HTML"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Export</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            disabled={!hasBlocks}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-accent text-text-inverted hover:bg-accent-hover transition-colors disabled:opacity-30"
          >
            {shareStatus === 'copied' ? (
              <>
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Copied!</span>
              </>
            ) : shareStatus === 'copying' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Share</span>
              </>
            )}
          </button>

          {/* Inspector toggle */}
          <button
            onClick={() => setShowInspector(!showInspector)}
            className={`p-1.5 rounded-lg transition-colors ${
              showInspector ? 'bg-bg-card text-text' : 'text-text-tertiary hover:text-text hover:bg-bg-card'
            }`}
            title={showInspector ? 'Hide inspector' : 'Show inspector'}
          >
            {showInspector ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Main: Chat | Canvas | Inspector ── */}
      <div className="flex flex-1 min-h-0">
        {/* Chat panel */}
        <div className="w-[340px] shrink-0 border-r border-border flex flex-col bg-bg">
          {/* Chat header */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-text-inverted" />
              </div>
              <div>
                <span className="text-xs font-semibold block">Pitch AI</span>
                <span className="text-[10px] text-text-tertiary">
                  {chatLoading ? 'Designing...' : isNewPitch ? 'Ready to build' : `${pitch?.blocks.length || 0} blocks`}
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
                <div className="h-12 w-12 rounded-2xl bg-bg-card flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="h-5 w-5 text-text-tertiary" />
                </div>
                <p className="text-sm font-semibold text-center mb-1">What are you pitching?</p>
                <p className="text-[11px] text-text-secondary text-center mb-4 max-w-[260px] mx-auto leading-relaxed">
                  Describe your pitch and AI will build it instantly. Or pick a starter below.
                </p>

                <div className="space-y-1.5">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleSend(action.prompt)}
                      className="w-full text-left rounded-xl border border-border px-3.5 py-2.5 text-[11px] text-text-secondary hover:text-text hover:border-border-hover hover:bg-bg-card transition-all"
                    >
                      <span className="font-medium text-text">{action.label}</span>
                      <span className="block text-[10px] text-text-tertiary mt-0.5 line-clamp-1">
                        {action.prompt.slice(0, 60)}...
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
                  className={`rounded-xl px-3.5 py-2.5 text-[11px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-accent text-text-inverted ml-6 rounded-br-sm'
                      : 'bg-bg-card border border-border text-text-secondary mr-4 rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="h-2.5 w-2.5 text-brand" />
                      <span className="text-[9px] font-semibold text-brand">AI</span>
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
                  <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                Building your pitch...
              </motion.div>
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
                placeholder={isNewPitch ? 'Describe your pitch...' : 'Ask for changes...'}
                disabled={chatLoading}
                className="flex-1 rounded-xl border border-border bg-bg px-3.5 py-2.5 text-xs text-text placeholder:text-text-tertiary focus:border-text focus:ring-0 focus:outline-none transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="p-2.5 rounded-xl bg-accent hover:bg-accent-hover text-text-inverted transition-all active:scale-95 disabled:opacity-30"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* ── Canvas ── */}
        <div className="flex-1 min-w-0 bg-bg-elevated overflow-auto">
          <div className={`mx-auto px-6 py-8 transition-all duration-300 ${viewModeWidths[viewMode]}`}>
            {(!hasBlocks) ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center"
              >
                <div className="h-20 w-20 rounded-2xl bg-bg-card flex items-center justify-center mb-6">
                  <Sparkles className="h-8 w-8 text-text-tertiary" />
                </div>
                <h2 className="text-lg font-bold mb-2">Your canvas is empty</h2>
                <p className="text-sm text-text-secondary max-w-xs leading-relaxed">
                  {chatLoading
                    ? 'Building your pitch — blocks will appear here momentarily...'
                    : 'Use the chat to describe your pitch. AI will generate a complete deck with 7-10 sections.'}
                </p>
                {chatLoading && (
                  <div className="mt-6 flex items-center gap-2 text-xs text-text-tertiary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating blocks...
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="space-y-3">
                {pitch!.blocks.map((block, i) => (
                  block.visible !== false && (
                    <motion.div
                      key={block.id || i}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3 }}
                      className="relative group"
                    >
                      {/* Block drag handle + index */}
                      <div className="absolute -left-8 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1">
                        <GripVertical className="h-4 w-4 text-text-tertiary cursor-grab" />
                        <span className="text-[9px] text-text-tertiary font-mono">{i + 1}</span>
                      </div>

                      <BlockRenderer
                        block={block}
                        accent={accentColor}
                        industry={i === 0 ? pitch?.industry : undefined}
                        selected={selectedBlockIndex === i}
                        onSelect={() => selectBlock(i)}
                      />
                    </motion.div>
                  )
                ))}

                {/* Add block placeholder */}
                <button
                  onClick={() => {
                    setChatInput('Add a new section: ');
                    document.querySelector<HTMLInputElement>('input[placeholder]')?.focus();
                  }}
                  className="w-full py-6 rounded-2xl border-2 border-dashed border-border hover:border-border-hover flex items-center justify-center gap-2 text-xs text-text-tertiary hover:text-text-secondary transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Add block via AI
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Inspector ── */}
        <AnimatePresence>
          {showInspector && selectedBlock && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-hidden"
            >
              <BlockInspector
                block={selectedBlock}
                blockIndex={selectedBlockIndex!}
                totalBlocks={pitch?.blocks.length || 0}
                onUpdate={handleBlockUpdate}
                onMove={handleBlockMove}
                onDelete={handleBlockDelete}
                onDuplicate={handleBlockDuplicate}
                onToggleVisibility={handleBlockToggleVisibility}
                onClose={() => {
                  setShowInspector(false);
                  setSelectedBlockIndex(null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
