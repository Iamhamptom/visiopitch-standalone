import { useState, useEffect } from 'react';
import {
  X, ChevronUp, ChevronDown, Trash2, Copy, Eye, EyeOff,
  Type, AlignLeft, Hash, List, Users, DollarSign, Clock,
} from 'lucide-react';
import type { PitchBlock } from '../../lib/api';

interface BlockInspectorProps {
  block: PitchBlock;
  blockIndex: number;
  totalBlocks: number;
  onUpdate: (index: number, props: Record<string, any>) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
  onToggleVisibility: (index: number) => void;
  onClose: () => void;
}

const BLOCK_ICONS: Record<string, typeof Type> = {
  hero: Type,
  story: AlignLeft,
  text: AlignLeft,
  proof: Hash,
  features: List,
  deliverables: List,
  timeline: Clock,
  budget: DollarSign,
  team: Users,
  comparison: List,
  gallery: List,
  cta: Type,
  terms: List,
  footer: AlignLeft,
};

export default function BlockInspector({
  block, blockIndex, totalBlocks,
  onUpdate, onMove, onDelete, onDuplicate, onToggleVisibility, onClose,
}: BlockInspectorProps) {
  const [localProps, setLocalProps] = useState<Record<string, any>>(block.props);

  useEffect(() => {
    setLocalProps(block.props);
  }, [block.id]);

  const updateProp = (key: string, value: any) => {
    const updated = { ...localProps, [key]: value };
    setLocalProps(updated);
    onUpdate(blockIndex, updated);
  };

  const Icon = BLOCK_ICONS[block.type] || Type;

  return (
    <div className="h-full flex flex-col bg-bg border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-text-tertiary" />
          <span className="text-xs font-semibold capitalize">{block.type} Block</span>
          <span className="text-[10px] text-text-tertiary">#{blockIndex + 1}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-bg-card text-text-tertiary hover:text-text transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Block actions */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border">
        <button
          onClick={() => onMove(blockIndex, 'up')}
          disabled={blockIndex === 0}
          className="p-1.5 rounded-md hover:bg-bg-card text-text-tertiary hover:text-text transition-colors disabled:opacity-30"
          title="Move up"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onMove(blockIndex, 'down')}
          disabled={blockIndex === totalBlocks - 1}
          className="p-1.5 rounded-md hover:bg-bg-card text-text-tertiary hover:text-text transition-colors disabled:opacity-30"
          title="Move down"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDuplicate(blockIndex)}
          className="p-1.5 rounded-md hover:bg-bg-card text-text-tertiary hover:text-text transition-colors"
          title="Duplicate"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onToggleVisibility(blockIndex)}
          className="p-1.5 rounded-md hover:bg-bg-card text-text-tertiary hover:text-text transition-colors"
          title={block.visible ? 'Hide' : 'Show'}
        >
          {block.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onDelete(blockIndex)}
          className="p-1.5 rounded-md hover:bg-error/10 text-text-tertiary hover:text-error transition-colors"
          title="Delete block"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Properties editor */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {block.type === 'hero' && (
          <>
            <PropField label="Headline" value={localProps.headline} onChange={(v) => updateProp('headline', v)} />
            <PropField label="Subheadline" value={localProps.subheadline} onChange={(v) => updateProp('subheadline', v)} multiline />
            <PropField label="CTA Text" value={localProps.ctaText} onChange={(v) => updateProp('ctaText', v)} />
          </>
        )}

        {(block.type === 'story' || block.type === 'text') && (
          <>
            <PropField label="Title" value={localProps.title} onChange={(v) => updateProp('title', v)} />
            <PropField label="Body" value={localProps.body} onChange={(v) => updateProp('body', v)} multiline rows={6} />
          </>
        )}

        {block.type === 'proof' && (
          <>
            <PropField label="Title" value={localProps.title} onChange={(v) => updateProp('title', v)} />
            <ArrayEditor
              label="Metrics"
              items={localProps.items || []}
              fields={[
                { key: 'value', label: 'Value', placeholder: '47%' },
                { key: 'metric', label: 'Label', placeholder: 'Faster Delivery' },
              ]}
              onChange={(items) => updateProp('items', items)}
            />
          </>
        )}

        {block.type === 'features' && (
          <>
            <PropField label="Title" value={localProps.title} onChange={(v) => updateProp('title', v)} />
            <ArrayEditor
              label="Features"
              items={localProps.items || []}
              fields={[
                { key: 'title', label: 'Title', placeholder: 'Feature name' },
                { key: 'description', label: 'Description', placeholder: 'Feature description' },
              ]}
              onChange={(items) => updateProp('items', items)}
            />
          </>
        )}

        {block.type === 'deliverables' && (
          <>
            <PropField label="Title" value={localProps.title} onChange={(v) => updateProp('title', v)} />
            <ArrayEditor
              label="Items"
              items={localProps.items || []}
              fields={[
                { key: 'title', label: 'Title', placeholder: 'Deliverable name' },
                { key: 'description', label: 'Description', placeholder: 'Description' },
              ]}
              onChange={(items) => updateProp('items', items)}
            />
          </>
        )}

        {block.type === 'timeline' && (
          <>
            <PropField label="Title" value={localProps.title} onChange={(v) => updateProp('title', v)} />
            <ArrayEditor
              label="Phases"
              items={localProps.items || []}
              fields={[
                { key: 'date', label: 'Date', placeholder: 'Week 1-2' },
                { key: 'title', label: 'Title', placeholder: 'Phase name' },
                { key: 'description', label: 'Description', placeholder: 'Details' },
              ]}
              onChange={(items) => updateProp('items', items)}
            />
          </>
        )}

        {block.type === 'budget' && (
          <>
            <PropField label="Title" value={localProps.title} onChange={(v) => updateProp('title', v)} />
            <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Tiers</div>
            {(localProps.tiers || []).map((tier: any, i: number) => (
              <div key={i} className="p-3 rounded-xl border border-border space-y-2 mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-text-secondary">Tier {i + 1}</span>
                  <button
                    onClick={() => {
                      const tiers = [...(localProps.tiers || [])];
                      tiers.splice(i, 1);
                      updateProp('tiers', tiers);
                    }}
                    className="text-text-tertiary hover:text-error"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <input
                  value={tier.name || ''}
                  onChange={(e) => {
                    const tiers = [...(localProps.tiers || [])];
                    tiers[i] = { ...tiers[i], name: e.target.value };
                    updateProp('tiers', tiers);
                  }}
                  placeholder="Tier name"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-bg focus:border-text focus:outline-none"
                />
                <input
                  value={tier.price || ''}
                  onChange={(e) => {
                    const tiers = [...(localProps.tiers || [])];
                    tiers[i] = { ...tiers[i], price: e.target.value };
                    updateProp('tiers', tiers);
                  }}
                  placeholder="Price"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-bg focus:border-text focus:outline-none"
                />
              </div>
            ))}
          </>
        )}

        {block.type === 'team' && (
          <>
            <PropField label="Title" value={localProps.title} onChange={(v) => updateProp('title', v)} />
            <ArrayEditor
              label="Members"
              items={localProps.members || []}
              fields={[
                { key: 'name', label: 'Name', placeholder: 'John Doe' },
                { key: 'role', label: 'Role', placeholder: 'CEO' },
              ]}
              onChange={(items) => updateProp('members', items)}
            />
          </>
        )}

        {block.type === 'cta' && (
          <>
            <PropField label="Headline" value={localProps.headline} onChange={(v) => updateProp('headline', v)} />
            <PropField label="Subheadline" value={localProps.subheadline} onChange={(v) => updateProp('subheadline', v)} multiline />
            <PropField label="Button Text" value={localProps.buttonText} onChange={(v) => updateProp('buttonText', v)} />
            <PropField label="Button URL" value={localProps.buttonUrl} onChange={(v) => updateProp('buttonUrl', v)} />
          </>
        )}

        {block.type === 'terms' && (
          <>
            <PropField label="Title" value={localProps.title} onChange={(v) => updateProp('title', v)} />
            <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Items</div>
            {(localProps.items || []).map((item: string, i: number) => (
              <div key={i} className="flex items-center gap-2 mb-1">
                <input
                  value={item}
                  onChange={(e) => {
                    const items = [...(localProps.items || [])];
                    items[i] = e.target.value;
                    updateProp('items', items);
                  }}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-bg focus:border-text focus:outline-none"
                />
                <button
                  onClick={() => {
                    const items = [...(localProps.items || [])];
                    items.splice(i, 1);
                    updateProp('items', items);
                  }}
                  className="text-text-tertiary hover:text-error"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </>
        )}

        {block.type === 'footer' && (
          <>
            <PropField label="Company" value={localProps.company} onChange={(v) => updateProp('company', v)} />
            <PropField label="Tagline" value={localProps.tagline} onChange={(v) => updateProp('tagline', v)} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Reusable prop field ──

function PropField({
  label, value, onChange, multiline, rows = 3, placeholder,
}: {
  label: string; value: any; onChange: (v: string) => void;
  multiline?: boolean; rows?: number; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5 block">{label}</label>
      {multiline ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-bg focus:border-text focus:outline-none resize-none leading-relaxed"
        />
      ) : (
        <input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-bg focus:border-text focus:outline-none"
        />
      )}
    </div>
  );
}

// ── Array items editor ──

function ArrayEditor({
  label, items, fields, onChange,
}: {
  label: string;
  items: any[];
  fields: { key: string; label: string; placeholder: string }[];
  onChange: (items: any[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{label}</span>
        <button
          onClick={() => {
            const empty: Record<string, string> = {};
            fields.forEach((f) => { empty[f.key] = ''; });
            onChange([...items, empty]);
          }}
          className="text-[10px] font-medium text-brand hover:text-brand-light transition-colors"
        >
          + Add
        </button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="p-3 rounded-xl border border-border space-y-1.5 mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-text-tertiary">{i + 1}</span>
            <button
              onClick={() => {
                const updated = [...items];
                updated.splice(i, 1);
                onChange(updated);
              }}
              className="text-text-tertiary hover:text-error"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          {fields.map((field) => (
            <input
              key={field.key}
              value={item[field.key] || ''}
              onChange={(e) => {
                const updated = [...items];
                updated[i] = { ...updated[i], [field.key]: e.target.value };
                onChange(updated);
              }}
              placeholder={field.placeholder}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-bg focus:border-text focus:outline-none"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
