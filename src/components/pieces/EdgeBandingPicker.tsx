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
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
        Edge banding <span className="text-gray-400">(click the edges to band)</span>
      </label>
      <div className="relative w-24 h-16 mx-auto my-1">
        <div className="absolute inset-[7px] border border-gray-300 dark:border-gray-600 rounded-sm bg-gray-50 dark:bg-gray-800" />
        {EDGES.map(edge => (
          <button
            key={edge.key}
            type="button"
            title={edge.label}
            onClick={() => toggle(edge.key)}
            className={`absolute rounded-full transition-colors ${edge.className} ${
              value[edge.key] ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
