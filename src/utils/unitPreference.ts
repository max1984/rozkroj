import { LAST_UNIT_KEY } from '../constants/defaults';

/**
 * Resolves the unit a *new* project should start in: whatever the user last
 * chose, so someone working in inches doesn't have to re-select it every
 * time they start a project. Existing projects always keep their own saved
 * unit regardless of this — it only seeds blank ones.
 */
export function getLastUnit(): 'mm' | 'inch' {
  try {
    const stored = localStorage.getItem(LAST_UNIT_KEY);
    if (stored === 'mm' || stored === 'inch') return stored;
  } catch {
    // localStorage unavailable (e.g. privacy mode) — fall through to the default.
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
