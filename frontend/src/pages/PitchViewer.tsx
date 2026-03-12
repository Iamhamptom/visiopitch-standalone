import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { pitches as pitchApi, type Pitch } from '../lib/api';
import BlockRenderer from '../components/pitch/BlockRenderer';
import { Loader2, Sparkles } from 'lucide-react';

export default function PitchViewer() {
  const { id, token } = useParams<{ id?: string; token?: string }>();
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setAllowDownload] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewStartTime = useRef(Date.now());

  // Load pitch — either by ID (public) or by share token
  useEffect(() => {
    if (token) {
      pitchApi.getShared(token)
        .then((data) => {
          setAllowDownload(data.allow_download);
          setPitch(data);
        })
        .catch((err) => setError(err.message));
    } else if (id) {
      pitchApi.getPublic(id)
        .then(setPitch)
        .catch(() => setError('Pitch not found'));
    }
  }, [id, token]);

  // Write HTML content to iframe (using Blob URL for security)
  useEffect(() => {
    if (!pitch?.html_content || !iframeRef.current) return;
    const blob = new Blob([pitch.html_content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframeRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [pitch?.html_content]);

  // Track view analytics on unmount
  useEffect(() => {
    return () => {
      const pitchId = pitch?.id;
      if (!pitchId) return;
      const duration = Math.round((Date.now() - viewStartTime.current) / 1000);
      pitchApi.recordView(pitchId, {
        share_token: token,
        duration_seconds: duration,
        scroll_depth: 1.0, // simplified — iframe content scroll isn't easily tracked
      }).catch(() => {});
    };
  }, [pitch?.id, token]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-2">
            {error === 'Share link expired' ? 'Link Expired' : 'Pitch not found'}
          </h1>
          <p className="text-sm text-white/50">
            {error === 'Share link expired'
              ? 'This share link has expired. Ask the creator for a new one.'
              : 'This pitch may have been removed or the link is invalid.'}
          </p>
        </div>
      </div>
    );
  }

  if (!pitch) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    );
  }

  // HTML-based pitch — render in full-page iframe
  if (pitch.html_content) {
    return (
      <div className="min-h-screen bg-[#0A0A0F]">
        <iframe
          ref={iframeRef}
          title={pitch.title}
          className="w-full min-h-screen border-0"
          sandbox="allow-scripts"
        />
      </div>
    );
  }

  // Legacy: Block-based pitch — render with BlockRenderer
  const accent = pitch.accent_color || '#6366F1';

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <div className="max-w-[900px] mx-auto">
        {pitch.blocks.filter(b => b.visible !== false).map((block, i) => (
          <motion.div
            key={block.id || i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
          >
            <BlockRenderer block={block} accent={accent} industry={i === 0 ? pitch.industry : undefined} />
          </motion.div>
        ))}
      </div>

      {/* Footer watermark */}
      <div className="text-center py-8 border-t border-white/6">
        <div className="flex items-center justify-center gap-1.5 text-white/20 text-xs">
          <Sparkles className="h-3 w-3" />
          Built with VisioPitch
        </div>
      </div>
    </div>
  );
}
