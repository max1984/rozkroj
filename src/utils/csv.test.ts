import { describe, expect, it } from 'vitest';
import { detectUnitFromHeaders } from './csv';

describe('detectUnitFromHeaders', () => {
  it('detects mm from a "Width (mm)" column', () => {
    expect(detectUnitFromHeaders(['Name', 'Width (mm)', 'Height (mm)'], 'inch')).toBe('mm');
  });

  it('detects inch from a "Width (inch)" column', () => {
    expect(detectUnitFromHeaders(['Name', 'Width (inch)', 'Height (inch)'], 'mm')).toBe('inch');
  });

  it('is case-insensitive when matching the width column', () => {
    expect(detectUnitFromHeaders(['name', 'WIDTH (INCH)'], 'mm')).toBe('inch');
  });

  it('falls back to the given default when no width column is present', () => {
    expect(detectUnitFromHeaders(['Name', 'Quantity'], 'inch')).toBe('inch');
  });

  it('falls back to the given default when fields is undefined', () => {
    expect(detectUnitFromHeaders(undefined, 'mm')).toBe('mm');
  });

  it('falls back to the given default when a width column has no unit annotation', () => {
    expect(detectUnitFromHeaders(['Name', 'Width', 'Height'], 'inch')).toBe('inch');
  });
});
