import { useStore } from '../../store';
import { useUnitDisplay } from '../../hooks/useUnitDisplay';

export function KerfSettings() {
  const settings = useStore(s => s.settings);
  const setSettings = useStore(s => s.setSettings);
  const { format, inputValue, toMm } = useUnitDisplay();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fresh Edge</label>
        <button
          onClick={() => setSettings({ freshEdge: !settings.freshEdge })}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.freshEdge ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${settings.freshEdge ? 'translate-x-4' : 'translate-x-1'}`} />
        </button>
      </div>

      {settings.freshEdge && (
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Trim per side ({format(settings.freshEdgeTrim)})
          </label>
          <input
            type="number"
            min="0"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
            value={inputValue(settings.freshEdgeTrim)}
            onChange={e => {
              const v = toMm(parseFloat(e.target.value));
              if (!isNaN(v) && v >= 0) setSettings({ freshEdgeTrim: v });
            }}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Saw Kerf ({format(settings.sawKerf)})
        </label>
        <input
          type="number"
          min="0"
          step="0.5"
          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
          value={inputValue(settings.sawKerf)}
          onChange={e => {
            const v = toMm(parseFloat(e.target.value));
            if (!isNaN(v) && v >= 0) setSettings({ sawKerf: v });
          }}
        />
      </div>
    </div>
  );
}
