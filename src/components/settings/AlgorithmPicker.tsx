import { useStore } from '../../store';
import { useTranslation } from '../../hooks/useTranslation';

export function AlgorithmPicker() {
  const { t } = useTranslation();
  const algorithm = useStore(s => s.algorithm);
  const setAlgorithm = useStore(s => s.setAlgorithm);

  const options = [
    { value: 'maxrects', label: t.optimalLabel, desc: t.optimalDesc },
    { value: 'easycut', label: t.easyCutLabel, desc: t.easyCutDesc },
  ] as const;

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-ink">{t.cutModeLabel}</label>
      <div className="flex gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => setAlgorithm(opt.value)}
            aria-pressed={algorithm === opt.value}
            className={`flex-1 rounded-md border px-3 py-2 text-left text-sm transition-colors ${algorithm === opt.value ? 'border-accent bg-accent-soft text-ink' : 'border-line hover:border-muted'}`}
          >
            <div className="font-medium">{opt.label}</div>
            <div className="text-xs text-muted">{opt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
