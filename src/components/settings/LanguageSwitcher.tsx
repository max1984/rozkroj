import { useStore } from '../../store';
import { LANGUAGES, type Language } from '../../i18n';

const LABELS: Record<Language, string> = { en: 'EN', pl: 'PL', de: 'DE' };

export function LanguageSwitcher() {
  const language = useStore(s => s.language);
  const setLanguage = useStore(s => s.setLanguage);

  return (
    <div className="flex items-center gap-1 rounded-md border border-line p-0.5 w-fit">
      {LANGUAGES.map(l => (
        <button
          key={l}
          onClick={() => setLanguage(l)}
          aria-pressed={language === l}
          className={`px-2.5 py-1 text-sm font-mono rounded transition-colors ${language === l ? 'bg-accent text-accent-ink' : 'text-muted hover:bg-surface-2'}`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
