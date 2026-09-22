import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from './testMemoryStorage';
import { getInitialDarkMode, persistDarkMode } from './darkMode';
import { DARK_MODE_KEY } from '../constants/defaults';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getInitialDarkMode', () => {
  it('returns the stored preference when one was saved as "true"', () => {
    const storage = new MemoryStorage();
    storage.setItem(DARK_MODE_KEY, 'true');
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('matchMedia', undefined);

    expect(getInitialDarkMode()).toBe(true);
  });

  it('returns the stored preference when one was saved as "false", even if the OS prefers dark', () => {
    const storage = new MemoryStorage();
    storage.setItem(DARK_MODE_KEY, 'false');
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('matchMedia', () => ({ matches: true }));

    expect(getInitialDarkMode()).toBe(false);
  });

  it('falls back to the OS preference when nothing was saved', () => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('dark') }));

    expect(getInitialDarkMode()).toBe(true);
  });

  it('falls back to light mode when nothing was saved and matchMedia is unavailable', () => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.stubGlobal('matchMedia', undefined);

    expect(getInitialDarkMode()).toBe(false);
  });

  it('falls back to the OS preference when localStorage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
    });
    vi.stubGlobal('matchMedia', () => ({ matches: true }));

    expect(getInitialDarkMode()).toBe(true);
  });
});

describe('persistDarkMode', () => {
  it('saves true and false as strings', () => {
    const storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);

    persistDarkMode(true);
    expect(storage.getItem(DARK_MODE_KEY)).toBe('true');

    persistDarkMode(false);
    expect(storage.getItem(DARK_MODE_KEY)).toBe('false');
  });

  it('does not throw when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => { throw new Error('blocked'); },
    });

    expect(() => persistDarkMode(true)).not.toThrow();
  });
});
