import type { Language, Translations } from './types';
import { en } from './translations/en';
import { pl } from './translations/pl';
import { de } from './translations/de';

export type { Language, Translations } from './types';
export { LANGUAGES } from './types';

export const TRANSLATIONS: Record<Language, Translations> = { en, pl, de };
