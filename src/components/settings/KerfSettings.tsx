import { useId } from 'react';
import { useStore } from '../../store';
import { useUnitDisplay } from '../../hooks/useUnitDisplay';
import { useTranslation } from '../../hooks/useTranslation';

export function KerfSettings() {
  const id = useId();
  const { t } = useTranslation();
  const settings = useStore(s => s.settings);
  const setSettings = useStore(s => s.setSettings);
  const { format, inputValue, toMm } = useUnitDisplay();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-ink">{t.freshEdgeLabel}</label>
        <button
          onClick={() => setSettings({ freshEdge: !settings.freshEdge })}
          aria-label={t.freshEdgeLabel}
          aria-pressed={settings.freshEdge}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.freshEdge ? 'bg-accent' : 'bg-surface-2'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-surface transition-transform ${settings.freshEdge ? 'translate-x-4' : 'translate-x-1'}`} />
        </button>
      </div>

      {settings.freshEdge && (
        <div>
          <label htmlFor={`${id}-trim`} className="block text-xs text-muted mb-1">
            {t.trimPerSideLabel} (<span className="font-mono">{format(settings.freshEdgeTrim)}</span>)
          </label>
          <input
            id={`${id}-trim`}
            type="number"
            min="0"
            className="field font-mono tabular-nums"
            value={inputValue(settings.freshEdgeTrim)}
            onChange={e => {
              const v = toMm(parseFloat(e.target.value));
              if (!isNaN(v) && v >= 0) setSettings({ freshEdgeTrim: v });
            }}
          />
        </div>
      )}

      <div>
        <label htmlFor={`${id}-kerf`} className="block text-sm font-medium text-ink mb-1">
          {t.sawKerfLabel} (<span className="font-mono">{format(settings.sawKerf)}</span>)
        </label>
        <input
          id={`${id}-kerf`}
          type="number"
          min="0"
          step="0.5"
          className="field font-mono tabular-nums"
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
