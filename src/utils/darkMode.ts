import { DARK_MODE_KEY } from '../constants/defaults';

/**
 * Resolves the dark-mode preference to use on first load: an explicit prior
 * choice saved in localStorage wins, otherwise the OS-level preference,
 * otherwise light mode.
 */
export function getInitialDarkMode(): boolean {
  try {
    const stored = localStorage.getItem(DARK_MODE_KEY);
    if (stored !== null) return stored === 'true';
  } catch {
    // localStorage unavailable (e.g. privacy mode) — fall through to OS preference.
  }
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

export function persistDarkMode(value: boolean): void {
  try {
    localStorage.setItem(DARK_MODE_KEY, String(value));
  } catch {
    // localStorage unavailable — the choice just won't survive a reload.
  }
}
