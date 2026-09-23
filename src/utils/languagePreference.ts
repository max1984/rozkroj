import { LANGUAGE_KEY } from '../constants/defaults';
import { LANGUAGES, type Language } from '../i18n/types';

/**
 * Resolves the UI language to use on first load: an explicit prior choice
 * saved in localStorage wins, otherwise the browser's language, otherwise
 * English.
 */
export function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (stored && (LANGUAGES as string[]).includes(stored)) return stored as Language;
  } catch {
    // localStorage unavailable (e.g. privacy mode) — fall through to browser language.
  }
  try {
    const browserLang = navigator.language.slice(0, 2).toLowerCase();
    if ((LANGUAGES as string[]).includes(browserLang)) return browserLang as Language;
  } catch {
    // navigator unavailable (e.g. non-browser test environment) — fall through.
  }
  return 'en';
}

export function persistLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // localStorage unavailable — the choice just won't survive a reload.
  }
}
