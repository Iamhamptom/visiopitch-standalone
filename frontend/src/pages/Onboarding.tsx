import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/auth';
import {
  Sparkles, ArrowRight, ArrowLeft, Palette, FileText,
  Zap, Globe, Check, Rocket,
} from 'lucide-react';

const STEPS = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: 'Welcome to VisioPitch',
    subtitle: 'Create stunning, AI-powered proposals in minutes — not hours.',
    description: 'VisioPitch combines world-class design with intelligent AI to help you build proposals that win deals.',
  },
  {
    id: 'how',
    icon: Zap,
    title: 'How it works',
    subtitle: 'Three simple steps to a winning pitch.',
    features: [
      { icon: FileText, label: 'Brief', desc: 'Tell our AI about your pitch — who it\'s for, what you\'re selling, your goals.' },
      { icon: Palette, label: 'Design', desc: 'AI generates a stunning multi-section proposal with your brand colors and content.' },
      { icon: Globe, label: 'Share', desc: 'Export as PDF, share via link, or send directly to your client with analytics.' },
    ],
  },
  {
    id: 'style',
    icon: Palette,
    title: 'Choose your default style',
    subtitle: 'You can always change this later per pitch.',
    styles: [
      { id: 'modern', label: 'Modern', color: '#6366F1', desc: 'Clean lines, bold type' },
      { id: 'corporate', label: 'Corporate', color: '#3B82F6', desc: 'Professional, structured' },
      { id: 'creative', label: 'Creative', color: '#EC4899', desc: 'Vibrant, expressive' },
      { id: 'luxury', label: 'Luxury', color: '#D4A847', desc: 'Elegant, premium feel' },
      { id: 'minimal', label: 'Minimal', color: '#8E8EA0', desc: 'Simple, content-first' },
    ],
  },
  {
    id: 'ready',
    icon: Rocket,
    title: 'You\'re all set!',
    subtitle: 'Start with a template or create from scratch with AI.',
    description: 'Your first pitch is just a conversation away.',
  },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState('modern');

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleFinish = () => {
    localStorage.setItem('vp_onboarded', 'true');
    localStorage.setItem('vp_style', selectedStyle);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-bg aurora-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i <= step ? 'bg-accent w-8' : 'bg-bg-active w-4'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="glass-card rounded-2xl p-8"
          >
            {/* Icon */}
            <div className="flex items-center justify-center mb-6">
              <div className="h-14 w-14 rounded-2xl gradient-accent flex items-center justify-center">
                <current.icon className="h-6 w-6 text-white" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-center mb-2 tracking-tight">
              {current.id === 'welcome' && user?.name
                ? `Welcome, ${user.name.split(' ')[0]}`
                : current.title}
            </h1>
            <p className="text-text-secondary text-center text-sm mb-6">
              {current.subtitle}
            </p>

            {/* Step-specific content */}
            {current.description && (
              <p className="text-text-tertiary text-center text-sm leading-relaxed mb-2">
                {current.description}
              </p>
            )}

            {/* How it works — features */}
            {current.features && (
              <div className="space-y-4 mt-4">
                {current.features.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-xl bg-bg-hover/50"
                  >
                    <div className="h-10 w-10 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
                      <f.icon className="h-4 w-4 text-accent-hover" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold mb-0.5">{f.label}</div>
                      <div className="text-xs text-text-secondary leading-relaxed">{f.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Style picker */}
            {current.styles && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {current.styles.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStyle(s.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedStyle === s.id
                        ? 'border-accent bg-accent-muted'
                        : 'border-border hover:border-border-hover bg-bg-hover/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-sm font-semibold">{s.label}</span>
                      {selectedStyle === s.id && (
                        <Check className="h-3 w-3 text-accent ml-auto" />
                      )}
                    </div>
                    <span className="text-xs text-text-tertiary">{s.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text transition-colors disabled:opacity-0"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {isLast ? (
            <button
              onClick={handleFinish}
              className="btn-accent"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}
              className="btn-primary"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={handleFinish}
            className="w-full text-center mt-4 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Skip onboarding
          </button>
        )}
      </motion.div>
    </div>
  );
}
