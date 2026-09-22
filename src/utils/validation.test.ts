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
});
