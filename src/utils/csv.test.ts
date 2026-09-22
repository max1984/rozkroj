import { describe, expect, it } from 'vitest';
import { detectUnitFromHeaders, edgesFromString, edgesToString } from './csv';
import type { PieceDefinition } from '../types';

function piece(edgeBanding: PieceDefinition['edgeBanding']): PieceDefinition {
  return {
    id: 'p1', name: 'Piece', materialId: 'm1', width: 100, height: 100, quantity: 1,
    grain: 'none', rotationAllowed: true, priority: false, edgeBanding, color: '#000000',
  };
}

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

describe('edgesToString', () => {
  it('returns an empty string when no edges are banded', () => {
    expect(edgesToString(piece({ top: false, right: false, bottom: false, left: false }))).toBe('');
  });

  it('joins banded edges with +, in top/right/bottom/left order', () => {
    expect(edgesToString(piece({ top: true, right: false, bottom: true, left: true }))).toBe('top+bottom+left');
  });

  it('includes all four edges when fully banded', () => {
    expect(edgesToString(piece({ top: true, right: true, bottom: true, left: true }))).toBe('top+right+bottom+left');
  });
});

describe('edgesFromString', () => {
  it('parses a +-joined edge list', () => {
    expect(edgesFromString('top+left')).toEqual({ top: true, right: false, bottom: false, left: true });
  });

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    expect(edgesFromString(' TOP + Right ')).toEqual({ top: true, right: true, bottom: false, left: false });
  });

  it('returns all-false for undefined', () => {
    expect(edgesFromString(undefined)).toEqual({ top: false, right: false, bottom: false, left: false });
  });

  it('returns all-false for an empty string', () => {
    expect(edgesFromString('')).toEqual({ top: false, right: false, bottom: false, left: false });
  });

  it('round-trips through edgesToString', () => {
    const banding = { top: true, right: false, bottom: true, left: false };
    expect(edgesFromString(edgesToString(piece(banding)))).toEqual(banding);
  });
});
