import { describe, expect, it } from 'vitest';
import { getPieceColor } from './colors';

describe('getPieceColor', () => {
  it('returns a stable color for a given index', () => {
    expect(getPieceColor(0)).toBe(getPieceColor(0));
  });

  it('returns different colors for different low indices', () => {
    expect(getPieceColor(0)).not.toBe(getPieceColor(1));
  });

  it('wraps around once the index exceeds the palette size', () => {
    // Palette has 20 entries; index 20 should cycle back to index 0's color.
    expect(getPieceColor(20)).toBe(getPieceColor(0));
    expect(getPieceColor(21)).toBe(getPieceColor(1));
  });
});
