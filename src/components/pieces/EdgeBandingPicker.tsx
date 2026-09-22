import type { EdgeBanding } from '../../types';

interface Props {
  value: EdgeBanding;
  onChange: (value: EdgeBanding) => void;
}

const EDGES: { key: keyof EdgeBanding; label: string; className: string }[] = [
  { key: 'top', label: 'Top edge', className: 'top-0 left-3 right-3 h-1.5' },
  { key: 'bottom', label: 'Bottom edge', className: 'bottom-0 left-3 right-3 h-1.5' },
  { key: 'left', label: 'Left edge', className: 'left-0 top-3 bottom-3 w-1.5' },
  { key: 'right', label: 'Right edge', className: 'right-0 top-3 bottom-3 w-1.5' },
];

export function EdgeBandingPicker({ value, onChange }: Props) {
  const toggle = (key: keyof EdgeBanding) => onChange({ ...value, [key]: !value[key] });

  return (
    <div>
      <label className="block text-xs text-muted mb-1">
        Edge banding <span className="text-muted">(click the edges to band)</span>
      </label>
      <div className="relative w-24 h-16 mx-auto my-1">
        <div className="absolute inset-[7px] border border-line rounded-sm bg-bg" />
        {EDGES.map(edge => (
          <button
            key={edge.key}
            type="button"
            title={edge.label}
            onClick={() => toggle(edge.key)}
            className={`absolute rounded-full transition-colors ${edge.className} ${
              value[edge.key] ? 'bg-accent' : 'bg-surface-2 hover:bg-line'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
