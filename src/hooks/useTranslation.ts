import { useStore } from '../store';
import { TRANSLATIONS, type Language, type Translations } from '../i18n';

/**
 * `language` defaults to English when a store mock doesn't set it (most
 * component tests don't), so every existing English-text assertion keeps
 * working without needing to know about i18n at all.
 */
export function useTranslation(): { t: Translations; language: Language } {
  const language = useStore(s => s.language) ?? 'en';
  return { t: TRANSLATIONS[language] ?? TRANSLATIONS.en, language };
}
