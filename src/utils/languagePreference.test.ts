import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from './testMemoryStorage';
import { getInitialLanguage, persistLanguage } from './languagePreference';
import { LANGUAGE_KEY } from '../constants/defaults';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getInitialLanguage', () => {
  it('returns the stored language when one was saved', () => {
    const storage = new MemoryStorage();
    storage.setItem(LANGUAGE_KEY, 'de');
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('navigator', { language: 'en-US' });

    expect(getInitialLanguage()).toBe('de');
  });

  it('falls back to the browser language when nothing was saved', () => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.stubGlobal('navigator', { language: 'pl-PL' });

    expect(getInitialLanguage()).toBe('pl');
  });

  it('falls back to English when the browser language is unsupported', () => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.stubGlobal('navigator', { language: 'fr-FR' });

    expect(getInitialLanguage()).toBe('en');
  });

  it('falls back to English when the stored value is garbage', () => {
    const storage = new MemoryStorage();
    storage.setItem(LANGUAGE_KEY, 'klingon');
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('navigator', { language: 'fr-FR' });

    expect(getInitialLanguage()).toBe('en');
  });

  it('falls back to the browser language when localStorage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
    });
    vi.stubGlobal('navigator', { language: 'de-DE' });

    expect(getInitialLanguage()).toBe('de');
  });
});

describe('persistLanguage', () => {
  it('saves the given language', () => {
    const storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);

    persistLanguage('pl');
    expect(storage.getItem(LANGUAGE_KEY)).toBe('pl');
  });

  it('does not throw when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => { throw new Error('blocked'); },
    });
    expect(() => persistLanguage('de')).not.toThrow();
  });
});
