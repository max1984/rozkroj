// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUnitDisplay } from './useUnitDisplay';

let unit: 'mm' | 'inch' = 'mm';

vi.mock('../store', () => ({
  useStore: (selector: (s: { unit: 'mm' | 'inch' }) => unknown) => selector({ unit }),
}));

afterEach(() => {
  vi.clearAllMocks();
  unit = 'mm';
});

describe('useUnitDisplay', () => {
  it('exposes the current unit from the store', () => {
    unit = 'inch';
    const { result } = renderHook(() => useUnitDisplay());
    expect(result.current.unit).toBe('inch');
  });

  it('format() delegates to formatDisplay with the current unit (mm)', () => {
    const { result } = renderHook(() => useUnitDisplay());
    expect(result.current.format(100)).toBe('100 mm');
  });

  it('format() delegates to formatDisplay with the current unit (inch)', () => {
    unit = 'inch';
    const { result } = renderHook(() => useUnitDisplay());
    expect(result.current.format(25.4)).toBe('1"');
  });

  it('inputValue() delegates to formatInputValue with the current unit', () => {
    unit = 'inch';
    const { result } = renderHook(() => useUnitDisplay());
    expect(result.current.inputValue(25.4)).toBe('1');
  });

  it('toMm() delegates to toMm with the current unit', () => {
    unit = 'inch';
    const { result } = renderHook(() => useUnitDisplay());
    expect(result.current.toMm(2)).toBe(50.8);
  });

  it('fromMm() delegates to fromMm with the current unit', () => {
    unit = 'inch';
    const { result } = renderHook(() => useUnitDisplay());
    expect(result.current.fromMm(50.8)).toBe(2);
  });
});
