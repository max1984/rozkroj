import { useStore } from '../../store';

export function UnitToggle() {
  const unit = useStore(s => s.unit);
  const setUnit = useStore(s => s.setUnit);

  return (
    <div className="flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 p-0.5 w-fit">
      {(['mm', 'inch'] as const).map(u => (
        <button
          key={u}
          onClick={() => setUnit(u)}
          className={`px-3 py-1 text-sm rounded transition-colors ${unit === u ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          {u === 'mm' ? 'mm' : 'inch'}
        </button>
      ))}
    </div>
  );
}
