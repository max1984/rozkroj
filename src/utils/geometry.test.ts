import { describe, expect, it } from 'vitest';
import { rectArea, rectContains, rectsOverlap } from './geometry';

describe('rectsOverlap', () => {
  it('detects overlapping rects', () => {
    expect(rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
  });

  it('detects rects that merely touch at an edge as non-overlapping', () => {
    expect(rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 10, height: 10 })).toBe(false);
  });

  it('detects fully separate rects as non-overlapping', () => {
    expect(rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 100, y: 100, width: 10, height: 10 })).toBe(false);
  });
});

describe('rectArea', () => {
  it('multiplies width and height', () => {
    expect(rectArea({ x: 0, y: 0, width: 4, height: 5 })).toBe(20);
  });
});

describe('rectContains', () => {
  it('returns true when inner rect fits entirely within outer', () => {
    const outer = { x: 0, y: 0, width: 100, height: 100 };
    const inner = { x: 10, y: 10, width: 20, height: 20 };
    expect(rectContains(outer, inner)).toBe(true);
  });

  it('returns true when inner rect exactly matches outer bounds', () => {
    const outer = { x: 0, y: 0, width: 100, height: 100 };
    expect(rectContains(outer, outer)).toBe(true);
  });

  it('returns false when inner rect extends past outer edge', () => {
    const outer = { x: 0, y: 0, width: 100, height: 100 };
    const inner = { x: 90, y: 90, width: 20, height: 20 };
    expect(rectContains(outer, inner)).toBe(false);
  });

  it('returns false when inner rect starts before outer origin', () => {
    const outer = { x: 10, y: 10, width: 100, height: 100 };
    const inner = { x: 0, y: 0, width: 20, height: 20 };
    expect(rectContains(outer, inner)).toBe(false);
  });
});
