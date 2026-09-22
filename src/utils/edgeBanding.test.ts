import { describe, expect, it } from 'vitest';
import type { EdgeBanding, PieceDefinition } from '../types';
import { edgeCount, mapEdgeBandingForRotation, totalBandingLengthMm } from './edgeBanding';

function piece(overrides: Partial<PieceDefinition>): PieceDefinition {
  return {
    id: 'p1',
    name: 'Piece',
    materialId: 'm1',
    width: 600,
    height: 400,
    quantity: 1,
    grain: 'none',
    rotationAllowed: true,
    priority: false,
    edgeBanding: { top: false, right: false, bottom: false, left: false },
    color: '#000000',
    ...overrides,
  };
}

describe('mapEdgeBandingForRotation', () => {
  const banding: EdgeBanding = { top: true, right: false, bottom: false, left: true };

  it('returns the banding unchanged when not rotated', () => {
    expect(mapEdgeBandingForRotation(banding, false)).toEqual(banding);
  });

  it('cycles edges 90° when rotated: left->top, top->right, right->bottom, bottom->left', () => {
    expect(mapEdgeBandingForRotation(banding, true)).toEqual({
      top: true,   // was left
      right: true, // was top
      bottom: false, // was right
      left: false, // was bottom
    });
  });
});

describe('edgeCount', () => {
  it('counts zero edges banded', () => {
    expect(edgeCount({ top: false, right: false, bottom: false, left: false })).toBe(0);
  });

  it('counts all four edges banded', () => {
    expect(edgeCount({ top: true, right: true, bottom: true, left: true })).toBe(4);
  });

  it('counts a mix of banded edges', () => {
    expect(edgeCount({ top: true, right: false, bottom: true, left: false })).toBe(2);
  });
});

describe('totalBandingLengthMm', () => {
  it('returns 0 when no piece has any banding', () => {
    const pieces = [piece({})];
    expect(totalBandingLengthMm(pieces)).toBe(0);
  });

  it('sums width for top/bottom and height for left/right edges', () => {
    const pieces = [
      piece({ width: 600, height: 400, quantity: 1, edgeBanding: { top: true, bottom: false, left: true, right: false } }),
    ];
    // top (width) + left (height) = 600 + 400
    expect(totalBandingLengthMm(pieces)).toBe(1000);
  });

  it('multiplies per-piece banding length by quantity', () => {
    const pieces = [
      piece({ width: 600, height: 400, quantity: 3, edgeBanding: { top: true, bottom: true, left: false, right: false } }),
    ];
    // (600 + 600) * 3
    expect(totalBandingLengthMm(pieces)).toBe(3600);
  });

  it('sums across multiple pieces', () => {
    const pieces = [
      piece({ id: 'a', width: 600, height: 400, quantity: 1, edgeBanding: { top: true, bottom: false, left: false, right: false } }),
      piece({ id: 'b', width: 300, height: 200, quantity: 2, edgeBanding: { top: false, bottom: false, left: true, right: true } }),
    ];
    // a: 600; b: (200+200)*2 = 800
    expect(totalBandingLengthMm(pieces)).toBe(1400);
  });
});
