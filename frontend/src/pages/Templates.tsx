import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { pitches as pitchApi } from '../lib/api';
import {
  ArrowLeft, Search, Loader2, Sparkles,
  Briefcase, Heart, Building2, Palette, Code, GraduationCap,
  Utensils, Home, Banknote, Music, Rocket, Star,
} from 'lucide-react';

interface Template {
  id: string;
  title: string;
  description: string;
  industry: string;
  icon: typeof Briefcase;
  color: string;
  blocks: number;
  tags: string[];
  prompt: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'saas-startup',
    title: 'SaaS Startup Pitch',
    description: 'Perfect for seed/Series A fundraising with metrics, traction, and team.',
    industry: 'tech',
    icon: Rocket,
    color: '#3B82F6',
    blocks: 8,
    tags: ['Fundraising', 'B2B', 'SaaS'],
    prompt: 'Create a SaaS startup pitch deck for fundraising. Include a hero with a bold headline, problem statement, solution overview, key metrics (MRR, growth rate, churn), product features with descriptions, competitive advantage comparison, team section, and a strong investor CTA. Use a modern tech aesthetic with blue accent.',
  },
  {
    id: 'agency-proposal',
    title: 'Creative Agency Proposal',
    description: 'Win clients with a stunning creative services proposal.',
    industry: 'agency',
    icon: Palette,
    color: '#8B5CF6',
    blocks: 9,
    tags: ['Services', 'Creative', 'Proposal'],
    prompt: 'Create a creative agency proposal pitch. Include a cinematic hero headline, our story/approach section, case study metrics showing past results, detailed deliverables checklist, project timeline, pricing tiers (Basic/Pro/Enterprise), team members, terms section, and a CTA to schedule a call. Use a vibrant purple accent color.',
  },
  {
    id: 'healthcare-saas',
    title: 'Healthcare Platform',
    description: 'HIPAA-compliant health tech proposal with trust signals.',
    industry: 'healthcare',
    icon: Heart,
    color: '#14B8A6',
    blocks: 8,
    tags: ['Healthcare', 'B2B', 'Enterprise'],
    prompt: 'Create a healthcare technology platform proposal. Include hero with trust-focused headline, problem statement about healthcare inefficiency, solution features, proof metrics (patient outcomes, time saved, cost reduction), compliance section (HIPAA, SOC2), pricing tiers, implementation timeline, and CTA. Use teal accent for trust.',
  },
  {
    id: 'real-estate',
    title: 'Real Estate Investment',
    description: 'Property development or investment pitch with financials.',
    industry: 'real-estate',
    icon: Building2,
    color: '#059669',
    blocks: 8,
    tags: ['Investment', 'Property', 'Finance'],
    prompt: 'Create a real estate investment pitch. Include hero with property/development name, market opportunity story, financial proof metrics (ROI, cap rate, IRR), property features, development timeline, investment tiers, team section, and investor CTA. Use green accent for growth/money.',
  },
  {
    id: 'music-marketing',
    title: 'Music Marketing Campaign',
    description: 'Artist campaign or label services proposal.',
    industry: 'music',
    icon: Music,
    color: '#D4A847',
    blocks: 9,
    tags: ['Music', 'Marketing', 'Campaign'],
    prompt: 'Create a music marketing campaign pitch. Include hero with bold campaign name, artist/label story, proof metrics (streams, social growth, press coverage), campaign deliverables (PR, social, playlist placement, visual content), timeline from pre-release to post-launch, budget tiers, team, and CTA. Use gold accent.',
  },
  {
    id: 'fintech',
    title: 'Fintech Startup',
    description: 'Modern fintech pitch with trust metrics and compliance.',
    industry: 'finance',
    icon: Banknote,
    color: '#0EA5E9',
    blocks: 8,
    tags: ['Fintech', 'B2C', 'Startup'],
    prompt: 'Create a fintech startup pitch. Include hero with disruptive headline, problem with traditional finance, solution features, proof metrics (users, transaction volume, growth), security/compliance features, pricing model, team with fintech backgrounds, and investor CTA. Use sky blue accent.',
  },
  {
    id: 'education',
    title: 'EdTech Platform',
    description: 'Educational technology proposal for schools or enterprise.',
    industry: 'education',
    icon: GraduationCap,
    color: '#6366F1',
    blocks: 8,
    tags: ['EdTech', 'B2B', 'Platform'],
    prompt: 'Create an EdTech platform pitch. Include hero, problem with current education/training, solution with AI-powered learning features, proof metrics (completion rates, engagement, outcomes), feature comparison, pricing for institutions, implementation timeline, and CTA. Use indigo accent.',
  },
  {
    id: 'restaurant',
    title: 'Restaurant / F&B Concept',
    description: 'Restaurant concept, franchise, or food brand pitch.',
    industry: 'food',
    icon: Utensils,
    color: '#F97316',
    blocks: 7,
    tags: ['Food', 'Hospitality', 'Concept'],
    prompt: 'Create a restaurant concept pitch. Include hero with restaurant name and tagline, our story and culinary vision, menu highlights section, proof metrics (projected revenue, foot traffic, margins), location and design timeline, investment tiers, and CTA to invest or partner. Use orange accent.',
  },
  {
    id: 'fashion',
    title: 'Fashion Brand Launch',
    description: 'Luxury or streetwear brand pitch with visual focus.',
    industry: 'fashion',
    icon: Star,
    color: '#EC4899',
    blocks: 8,
    tags: ['Fashion', 'D2C', 'Launch'],
    prompt: 'Create a fashion brand launch pitch. Include cinematic hero, brand story and mission, collection overview features, market proof metrics (TAM, target demographic, social following), distribution timeline, pricing/investment tiers, team section, and CTA. Use pink accent.',
  },
  {
    id: 'consulting',
    title: 'Consulting Services',
    description: 'Management or technology consulting engagement proposal.',
    industry: 'general',
    icon: Briefcase,
    color: '#64748B',
    blocks: 8,
    tags: ['Consulting', 'B2B', 'Services'],
    prompt: 'Create a management consulting services proposal. Include hero with firm name, our approach/methodology story, proof metrics (client success rates, projects delivered, average ROI), detailed deliverables, engagement timeline, pricing tiers (Assessment/Strategy/Full Engagement), team with credentials, and CTA. Use slate accent.',
  },
  {
    id: 'proptech',
    title: 'PropTech Platform',
    description: 'Property technology platform with smart features.',
    industry: 'real-estate',
    icon: Home,
    color: '#059669',
    blocks: 8,
    tags: ['PropTech', 'B2B', 'Platform'],
    prompt: 'Create a PropTech platform pitch. Include hero, problem with property management, AI-powered solution features, proof metrics (properties managed, time saved, revenue increase), feature comparison with competitors, pricing tiers, implementation timeline, and CTA. Use emerald accent.',
  },
  {
    id: 'dev-tools',
    title: 'Developer Tools',
    description: 'API, SDK, or dev platform pitch for technical audiences.',
    industry: 'tech',
    icon: Code,
    color: '#22D3EE',
    blocks: 8,
    tags: ['DevTools', 'API', 'B2D'],
    prompt: 'Create a developer tools pitch. Include hero with technical headline, developer pain point story, solution features (API, SDK, CLI), proof metrics (API calls, latency, uptime, developers), integration comparison, pricing tiers (Free/Pro/Enterprise), team section, and CTA. Use cyan accent.',
  },
];

const CATEGORIES = ['All', 'SaaS', 'Services', 'Startup', 'B2B', 'Creative', 'Healthcare', 'Finance'];

export default function Templates() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [creating, setCreating] = useState<string | null>(null);

  const filtered = TEMPLATES.filter((t) => {
    const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = category === 'All' || t.tags.includes(category);
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = async (template: Template) => {
    setCreating(template.id);
    try {
      const pitch = await pitchApi.create({
        title: template.title,
        industry: template.industry,
        accent_color: template.color,
      });
      navigate(`/builder/${pitch.id}?prompt=${encodeURIComponent(template.prompt)}`);
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-1.5 rounded-lg hover:bg-bg-card text-text-secondary hover:text-text transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-text-inverted" />
            </div>
            <span className="font-semibold text-sm">Templates</span>
          </div>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Title + Search */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Start with a template</h1>
          <p className="text-sm text-text-secondary mb-6">
            Choose a starting point — AI will customize everything for your brand.
          </p>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border bg-bg text-sm focus:border-text focus:ring-0 outline-none transition-all"
              />
            </div>

            {/* Category chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`whitespace-nowrap ${category === cat ? 'chip chip-active' : 'chip'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((template, i) => {
            const Icon = template.icon;
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="group relative rounded-2xl border border-border bg-bg overflow-hidden cursor-pointer transition-all hover:border-border-hover hover:shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
                onClick={() => handleUseTemplate(template)}
              >
                {/* Color area */}
                <div
                  className="h-28 flex items-center justify-center transition-all duration-300 group-hover:h-32"
                  style={{
                    background: `linear-gradient(135deg, ${template.color}12, ${template.color}06)`,
                    borderBottom: `1px solid ${template.color}15`,
                  }}
                >
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: `${template.color}15` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: template.color }} />
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-sm font-semibold mb-1">
                    {template.title}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed mb-3">
                    {template.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {template.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="chip text-[10px] py-0.5 px-2">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] text-text-tertiary">{template.blocks} blocks</span>
                  </div>
                </div>

                {/* Loading overlay */}
                {creating === template.id && (
                  <div className="absolute inset-0 bg-bg/80 flex items-center justify-center rounded-2xl">
                    <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-text-secondary text-sm">No templates match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
