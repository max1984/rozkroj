import { describe, expect, it } from 'vitest';
import { parsePositiveInt } from './validation';

describe('parsePositiveInt', () => {
  it('parses a valid positive integer string', () => {
    expect(parsePositiveInt('5')).toBe(5);
  });

  it('trims surrounding whitespace', () => {
    expect(parsePositiveInt('  12 ')).toBe(12);
  });

  it('accepts and normalizes leading zeros', () => {
    expect(parsePositiveInt('007')).toBe(7);
  });

  it('rejects an empty string', () => {
    expect(parsePositiveInt('')).toBeNull();
  });

  it('rejects zero', () => {
    expect(parsePositiveInt('0')).toBeNull();
  });

  it('rejects a negative number', () => {
    expect(parsePositiveInt('-3')).toBeNull();
  });

  it('rejects a decimal value', () => {
    expect(parsePositiveInt('2.5')).toBeNull();
  });

  it('rejects non-numeric text', () => {
    expect(parsePositiveInt('abc')).toBeNull();
  });

  it('rejects a number with trailing junk', () => {
    expect(parsePositiveInt('5x')).toBeNull();
  });

  it('has no upper bound by default', () => {
    expect(parsePositiveInt('999999999')).toBe(999999999);
  });

  it('rejects a value above an explicit max', () => {
    expect(parsePositiveInt('1001', 1000)).toBeNull();
  });

  it('accepts a value exactly at an explicit max', () => {
    expect(parsePositiveInt('1000', 1000)).toBe(1000);
  });
});
