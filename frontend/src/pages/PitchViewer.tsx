import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { pitches as pitchApi, type Pitch } from '../lib/api';
import BlockRenderer from '../components/pitch/BlockRenderer';
import { Loader2, Sparkles } from 'lucide-react';

export default function PitchViewer() {
  const { id } = useParams<{ id: string }>();
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    pitchApi.getPublic(id)
      .then(setPitch)
      .catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-2">Pitch not found</h1>
          <p className="text-sm text-white/50">This pitch may have been removed or the link is invalid.</p>
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
