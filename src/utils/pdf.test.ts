import { describe, expect, it } from 'vitest';
import { edgesLabel } from './pdf';
import type { PieceDefinition } from '../types';

function piece(edgeBanding: PieceDefinition['edgeBanding']): PieceDefinition {
  return {
    id: 'p1', name: 'Piece', materialId: 'm1', width: 100, height: 100, quantity: 1,
    grain: 'none', rotationAllowed: true, priority: false, edgeBanding, color: '#000000',
  };
}

describe('edgesLabel', () => {
  it('returns an empty string when no edges are banded', () => {
    expect(edgesLabel(piece({ top: false, right: false, bottom: false, left: false }))).toBe('');
  });

  it('returns single-letter codes in top/right/bottom/left order', () => {
    expect(edgesLabel(piece({ top: true, right: false, bottom: true, left: true }))).toBe('TBL');
  });

  it('returns all four letters when fully banded', () => {
    expect(edgesLabel(piece({ top: true, right: true, bottom: true, left: true }))).toBe('TRBL');
  });
});
