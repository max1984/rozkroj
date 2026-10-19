import { useId } from 'react';
import { useStore } from '../../store';
import { useUnitDisplay } from '../../hooks/useUnitDisplay';
import { useTranslation } from '../../hooks/useTranslation';

export function KerfSettings() {
  const id = useId();
  const { t } = useTranslation();
  const settings = useStore(s => s.settings);
  const setSettings = useStore(s => s.setSettings);
  const { unit, format, inputValue, toMm } = useUnitDisplay();

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
          {/* Was a fully-controlled `value={inputValue(...)}` that committed
              on every onChange — but inputValue() reformats the just-
              committed number on every render, so typing a decimal point
              (e.g. "1" then "." toward "1.5") committed parseFloat('1.')===1
              immediately, which re-rendered the field back to the plain "1"
              and silently erased the "." the user had just typed, making it
              impossible to enter any decimal trim character-by-character.
              Switched to the same uncontrolled defaultValue + onBlur-commit
              idiom MaterialManager's custom-size fields already use for the
              identical reason — see the comment there for why the key
              includes both `unit` and the stored mm value (forces a remount
              with a fresh defaultValue whenever either changes from
              elsewhere) and why the comparison below is on parsed numbers,
              not raw strings or the toMm()'d result. */}
          <input
            key={`${id}-trim-${unit}-${settings.freshEdgeTrim}`}
            id={`${id}-trim`}
            type="number"
            min="0"
            className="field font-mono tabular-nums"
            defaultValue={inputValue(settings.freshEdgeTrim)}
            onBlur={e => {
              if (parseFloat(e.target.value) === parseFloat(inputValue(settings.freshEdgeTrim))) return;
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
        {/* Same decimal-typing bug and fix as freshEdgeTrim above — doubly
            relevant here since step="0.5" implies users regularly need to
            type a decimal (e.g. a 2.5mm blade kerf). */}
        <input
          key={`${id}-kerf-${unit}-${settings.sawKerf}`}
          id={`${id}-kerf`}
          type="number"
          min="0"
          step="0.5"
          className="field font-mono tabular-nums"
          defaultValue={inputValue(settings.sawKerf)}
          onBlur={e => {
            if (parseFloat(e.target.value) === parseFloat(inputValue(settings.sawKerf))) return;
            const v = toMm(parseFloat(e.target.value));
            if (!isNaN(v) && v >= 0) setSettings({ sawKerf: v });
          }}
        />
      </div>
    </div>
  );
}
