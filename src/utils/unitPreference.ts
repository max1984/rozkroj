import { LAST_UNIT_KEY } from '../constants/defaults';

// The only regions where inches, not mm, are the everyday measurement for
// cutting material — same idea as getInitialLanguage() (languagePreference.ts)
// falling back to the browser's language before settling on a hardcoded
// default, but that fallback stopped at language and never extended to unit:
// an English UI (e.g. 'en-US', inferred from navigator.language) still
// silently defaulted to mm for a first-time visitor who almost certainly
// means inches.
const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM']);

/**
 * Resolves the unit a *new* project should start in: whatever the user last
 * explicitly chose, so someone working in inches doesn't have to re-select it
 * every time they start a project; failing that, inches for the handful of
 * locales that actually use them day to day, mm everywhere else. Existing
 * projects always keep their own saved unit regardless of this — it only
 * seeds blank ones.
 */
export function getLastUnit(): 'mm' | 'inch' {
  try {
    const stored = localStorage.getItem(LAST_UNIT_KEY);
    if (stored === 'mm' || stored === 'inch') return stored;
  } catch {
    // localStorage unavailable (e.g. privacy mode) — fall through to locale detection.
  }
  try {
    const region = navigator.language.split('-')[1]?.toUpperCase();
    if (region && IMPERIAL_REGIONS.has(region)) return 'inch';
  } catch {
    // navigator unavailable (e.g. non-browser test environment) — fall through.
  }
  return 'mm';
}

export function persistLastUnit(unit: 'mm' | 'inch'): void {
  try {
    localStorage.setItem(LAST_UNIT_KEY, unit);
  } catch {
    // localStorage unavailable — the choice just won't survive a reload.
  }
}
