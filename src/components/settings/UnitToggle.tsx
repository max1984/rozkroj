import { useStore } from '../../store';
import { useTranslation } from '../../hooks/useTranslation';

export function UnitToggle() {
  const { t } = useTranslation();
  const unit = useStore(s => s.unit);
  const setUnit = useStore(s => s.setUnit);

  return (
    // Same gap as LanguageSwitcher.tsx (see its comment) — this sibling
    // toggle (the i18n infrastructure commit that added LanguageSwitcher
    // explicitly describes it as mirroring this component) had no group
    // label either, so it gets the same fix plus a matching translation key.
    <div role="group" aria-label={t.unitSwitcherTitle} className="flex items-center gap-1 rounded-md border border-line p-0.5 w-fit">
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
