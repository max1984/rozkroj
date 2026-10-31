import { useStore } from '../../store';
import { LANGUAGES, type Language } from '../../i18n';
import { useTranslation } from '../../hooks/useTranslation';

const LABELS: Record<Language, string> = { en: 'EN', pl: 'PL', de: 'DE' };

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const language = useStore(s => s.language);
  const setLanguage = useStore(s => s.setLanguage);

  return (
    // languageSwitcherTitle existed in every translation file since the i18n
    // infrastructure was first added, but was never actually wired to
    // anything in this component — the only control here with no
    // accessible-name announcement at all for the GROUP of buttons, unlike
    // every other multi-button toggle in this codebase (Nav's lang-toggle in
    // the cwaniak sibling project, for instance, has had role="group" +
    // aria-label since its own i18n support landed). A screen reader user
    // landed on three unlabeled buttons reading only "EN"/"PL"/"DE", with no
    // indication this group is the language switcher versus e.g. a filter.
    <div role="group" aria-label={t.languageSwitcherTitle} className="flex items-center gap-1 rounded-md border border-line p-0.5 w-fit">
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
