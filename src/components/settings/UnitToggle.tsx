import { useStore } from '../../store';

export function UnitToggle() {
  const unit = useStore(s => s.unit);
  const setUnit = useStore(s => s.setUnit);

  return (
    <div className="flex items-center gap-1 rounded-md border border-line p-0.5 w-fit">
      {(['mm', 'inch'] as const).map(u => (
        <button
          key={u}
          onClick={() => setUnit(u)}
          aria-pressed={unit === u}
          className={`px-3 py-1 text-sm font-mono rounded transition-colors ${unit === u ? 'bg-accent text-accent-ink' : 'text-muted hover:bg-surface-2'}`}
        >
          {u === 'mm' ? 'mm' : 'inch'}
        </button>
      ))}
    </div>
  );
}
