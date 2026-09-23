import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from './testMemoryStorage';
import { getLastUnit, persistLastUnit } from './unitPreference';
import { LAST_UNIT_KEY } from '../constants/defaults';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getLastUnit', () => {
  it('returns the stored unit when one was saved', () => {
    const storage = new MemoryStorage();
    storage.setItem(LAST_UNIT_KEY, 'inch');
    vi.stubGlobal('localStorage', storage);

    expect(getLastUnit()).toBe('inch');
  });

  it('defaults to mm when nothing was saved', () => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    expect(getLastUnit()).toBe('mm');
  });

  it('defaults to mm when the stored value is garbage', () => {
    const storage = new MemoryStorage();
    storage.setItem(LAST_UNIT_KEY, 'furlongs');
    vi.stubGlobal('localStorage', storage);

    expect(getLastUnit()).toBe('mm');
  });

  it('defaults to mm when localStorage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
    });
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
