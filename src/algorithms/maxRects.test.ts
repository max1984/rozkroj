import { describe, expect, it } from 'vitest';
import type { FreeRect } from '../types';
import { findBestPlacement, placePiece } from './maxRects';

describe('findBestPlacement', () => {
  it('returns null when there are no free rects', () => {
    expect(findBestPlacement([], 100, 100, false, 0)).toBeNull();
  });

  it('returns null when the piece (plus kerf) fits in no free rect', () => {
    const freeRects: FreeRect[] = [{ x: 0, y: 0, width: 50, height: 50 }];
    expect(findBestPlacement(freeRects, 60, 60, false, 0)).toBeNull();
  });

  it('places a piece that exactly fits a free rect at its origin', () => {
    const freeRects: FreeRect[] = [{ x: 10, y: 20, width: 100, height: 100 }];
    const result = findBestPlacement(freeRects, 100, 100, false, 0);
    expect(result).toMatchObject({ x: 10, y: 20, rotated: false });
  });

  it('accounts for saw kerf when checking whether a piece fits', () => {
    const freeRects: FreeRect[] = [{ x: 0, y: 0, width: 100, height: 100 }];
    // Piece is 100x100 but a 5mm kerf pushes the required space to 105x105.
    expect(findBestPlacement(freeRects, 100, 100, false, 5)).toBeNull();
    expect(findBestPlacement(freeRects, 95, 95, false, 5)).toMatchObject({ x: 0, y: 0 });
  });

  it('picks the free rect with the best (smallest) short-side leftover', () => {
    const freeRects: FreeRect[] = [
      { x: 0, y: 0, width: 500, height: 500 },   // huge leftover
      { x: 600, y: 0, width: 110, height: 110 }, // tight fit for a 100x100 piece
    ];
    const result = findBestPlacement(freeRects, 100, 100, false, 0);
    expect(result).toMatchObject({ x: 600, y: 0 });
  });

  it('does not try rotation when rotationAllowed is false, even if rotated would fit better', () => {
    const freeRects: FreeRect[] = [{ x: 0, y: 0, width: 60, height: 200 }];
    // Unrotated (100x60) does not fit a 60-wide rect; rotated (60x100) would.
    expect(findBestPlacement(freeRects, 100, 60, false, 0)).toBeNull();
  });

  it('tries rotation when rotationAllowed is true and reports rotated: true', () => {
    const freeRects: FreeRect[] = [{ x: 0, y: 0, width: 60, height: 200 }];
    const result = findBestPlacement(freeRects, 100, 60, true, 0);
    expect(result).toMatchObject({ x: 0, y: 0, rotated: true });
  });

  it('skips the rotation attempt for a square piece', () => {
    const freeRects: FreeRect[] = [{ x: 0, y: 0, width: 100, height: 100 }];
    const result = findBestPlacement(freeRects, 100, 100, true, 0);
    expect(result?.rotated).toBe(false);
  });
});

describe('placePiece', () => {
  it('fully consumes a free rect that exactly matches the placed piece', () => {
    const freeRects: FreeRect[] = [{ x: 0, y: 0, width: 100, height: 100 }];
    expect(placePiece(freeRects, 0, 0, 100, 100)).toEqual([]);
  });

  it('leaves the right-hand strip free when a piece is placed in the top-left corner', () => {
    const freeRects: FreeRect[] = [{ x: 0, y: 0, width: 200, height: 100 }];
    const result = placePiece(freeRects, 0, 0, 100, 100);
    expect(result).toEqual([{ x: 100, y: 0, width: 100, height: 100 }]);
  });

  it('leaves top and bottom strips free when a piece is placed in the middle of a column', () => {
    const freeRects: FreeRect[] = [{ x: 0, y: 0, width: 100, height: 300 }];
    const result = placePiece(freeRects, 0, 100, 100, 100);
    expect(result).toEqual(
      expect.arrayContaining([
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 0, y: 200, width: 100, height: 100 },
      ])
    );
    expect(result).toHaveLength(2);
  });

  it('leaves a non-overlapping free rect untouched', () => {
    const freeRects: FreeRect[] = [
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 500, y: 500, width: 50, height: 50 },
    ];
    const result = placePiece(freeRects, 0, 0, 100, 100);
    expect(result).toEqual([{ x: 500, y: 500, width: 50, height: 50 }]);
  });

  it('prunes free rects that end up fully contained within another free rect', () => {
    const freeRects: FreeRect[] = [
      { x: 0, y: 0, width: 200, height: 200 },
      { x: 0, y: 0, width: 100, height: 100 },
    ];
    // Placed far away so both free rects pass through the split step untouched,
    // and only pruning removes the smaller, fully-contained one.
    const result = placePiece(freeRects, 1000, 1000, 10, 10);
    expect(result).toEqual([{ x: 0, y: 0, width: 200, height: 200 }]);
  });
});
