// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTranslation } from './useTranslation';
import type { Language } from '../i18n';

let language: Language | undefined = undefined;

vi.mock('../store', () => ({
  useStore: (selector: (s: { language: Language | undefined }) => unknown) => selector({ language }),
}));

afterEach(() => {
  vi.clearAllMocks();
  language = undefined;
});

describe('useTranslation', () => {
  it('defaults to English when the store has no language set', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.language).toBe('en');
    expect(result.current.t.saveProjectTitle).toBe('Save project');
  });

  it('returns Polish translations when the store language is "pl"', () => {
    language = 'pl';
    const { result } = renderHook(() => useTranslation());
    expect(result.current.language).toBe('pl');
    expect(result.current.t.saveProjectTitle).toBe('Zapisz projekt');
  });

  it('returns German translations when the store language is "de"', () => {
    language = 'de';
    const { result } = renderHook(() => useTranslation());
    expect(result.current.language).toBe('de');
    expect(result.current.t.saveProjectTitle).toBe('Projekt speichern');
  });
});
