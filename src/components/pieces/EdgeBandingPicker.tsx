import { useTranslation } from '../../hooks/useTranslation';
import type { EdgeBanding } from '../../types';
import type { Translations } from '../../i18n';

interface Props {
  value: EdgeBanding;
  onChange: (value: EdgeBanding) => void;
}

function edges(t: Translations): { key: keyof EdgeBanding; label: string; className: string }[] {
  return [
    { key: 'top', label: t.topEdge, className: 'top-0 left-3 right-3 h-1.5' },
    { key: 'bottom', label: t.bottomEdge, className: 'bottom-0 left-3 right-3 h-1.5' },
    { key: 'left', label: t.leftEdge, className: 'left-0 top-3 bottom-3 w-1.5' },
    { key: 'right', label: t.rightEdge, className: 'right-0 top-3 bottom-3 w-1.5' },
  ];
}

export function EdgeBandingPicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const toggle = (key: keyof EdgeBanding) => onChange({ ...value, [key]: !value[key] });

  return (
    <div>
      <label className="block text-xs text-muted mb-1">
        {t.edgeBandingLabel} <span className="text-muted">{t.edgeBandingHint}</span>
      </label>
      <div className="relative w-24 h-16 mx-auto my-1">
        <div className="absolute inset-[7px] border border-line rounded-sm bg-bg" />
        {edges(t).map(edge => (
          <button
            key={edge.key}
            type="button"
            title={edge.label}
            aria-label={edge.label}
            aria-pressed={value[edge.key]}
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
