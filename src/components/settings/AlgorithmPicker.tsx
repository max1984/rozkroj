import { useStore } from '../../store';

export function AlgorithmPicker() {
  const algorithm = useStore(s => s.algorithm);
  const setAlgorithm = useStore(s => s.setAlgorithm);

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cut Mode</label>
      <div className="flex gap-2">
        {([
          { value: 'maxrects', label: 'Optimal', desc: 'Best material usage' },
          { value: 'easycut', label: 'Easy Cut', desc: 'Sequential saw cuts' },
        ] as const).map(opt => (
          <button
            key={opt.value}
            onClick={() => setAlgorithm(opt.value)}
            className={`flex-1 rounded border px-3 py-2 text-left text-sm transition-colors ${algorithm === opt.value ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}
          >
            <div className="font-medium">{opt.label}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
