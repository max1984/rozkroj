import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from './testMemoryStorage';
import { getLastUnit, persistLastUnit } from './unitPreference';
import { LAST_UNIT_KEY } from '../constants/defaults';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getLastUnit', () => {
  it('returns the stored unit when one was saved, even in an imperial locale', () => {
    const storage = new MemoryStorage();
    storage.setItem(LAST_UNIT_KEY, 'inch');
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('navigator', { language: 'en-US' });

    expect(getLastUnit()).toBe('inch');
  });

  it('defaults to mm when nothing was saved and the locale is metric', () => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.stubGlobal('navigator', { language: 'fr-FR' });
    expect(getLastUnit()).toBe('mm');
  });

  it('defaults to mm when the stored value is garbage and the locale is metric', () => {
    const storage = new MemoryStorage();
    storage.setItem(LAST_UNIT_KEY, 'furlongs');
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('navigator', { language: 'fr-FR' });

    expect(getLastUnit()).toBe('mm');
  });

  it('defaults to mm when localStorage throws and the locale is metric', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
    });
    vi.stubGlobal('navigator', { language: 'fr-FR' });
    expect(getLastUnit()).toBe('mm');
  });

  it(
    'falls back to inch for an imperial-locale visitor with nothing saved — same idea as ' +
      'getInitialLanguage() falling back to the browser language, extended from language to unit',
    () => {
      vi.stubGlobal('localStorage', new MemoryStorage());
      vi.stubGlobal('navigator', { language: 'en-US' });
      expect(getLastUnit()).toBe('inch');
    },
  );

  it('falls back to mm when navigator.language has no region subtag', () => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.stubGlobal('navigator', { language: 'en' });
    expect(getLastUnit()).toBe('mm');
  });

  it('checks locale even when localStorage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
    });
    vi.stubGlobal('navigator', { language: 'en-US' });
    expect(getLastUnit()).toBe('inch');
  });

  it('defaults to mm when navigator is unavailable', () => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.stubGlobal('navigator', undefined);
    expect(getLastUnit()).toBe('mm');
  });
});

describe('persistLastUnit', () => {
  it('saves the given unit', () => {
    const storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);

    persistLastUnit('inch');
    expect(storage.getItem(LAST_UNIT_KEY)).toBe('inch');
  });

  it('does not throw when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => { throw new Error('blocked'); },
    });
    expect(() => persistLastUnit('mm')).not.toThrow();
  });
});
