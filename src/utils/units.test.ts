import { describe, expect, it } from 'vitest';
import { formatDisplay, formatInputValue, fromMm, toMm } from './units';

describe('toMm', () => {
  it('passes mm values through unchanged', () => {
    expect(toMm(500, 'mm')).toBe(500);
  });

  it('converts inches to mm, rounded to 1 decimal', () => {
    expect(toMm(1, 'inch')).toBe(25.4);
    expect(toMm(2, 'inch')).toBe(50.8);
  });
});

describe('fromMm', () => {
  it('passes mm values through unchanged', () => {
    expect(fromMm(500, 'mm')).toBe(500);
  });

  it('converts mm to inches', () => {
    expect(fromMm(25.4, 'inch')).toBeCloseTo(1, 5);
  });
});

describe('formatDisplay', () => {
  it('formats mm with unit suffix', () => {
    expect(formatDisplay(600, 'mm')).toBe('600 mm');
  });

  it('formats whole inches without a fraction', () => {
    expect(formatDisplay(25.4, 'inch')).toBe('1"');
  });

  it('formats fractional inches reduced to lowest terms', () => {
    expect(formatDisplay(12.7, 'inch')).toBe('1/2"');
  });

  it('formats a whole-plus-fraction inch value', () => {
    expect(formatDisplay(25.4 + 12.7, 'inch')).toBe('1 1/2"');
  });
});

describe('formatInputValue', () => {
  it('returns the raw mm value as a string', () => {
    expect(formatInputValue(600, 'mm')).toBe('600');
  });

  it('returns a trimmed decimal inch value', () => {
    expect(formatInputValue(25.4, 'inch')).toBe('1');
  });
});
