import { describe, expect, it } from 'vitest';
import { runOptimizer } from './optimizer';
import type { CuttingSettings, MaterialStock, OffcutItem, PieceDefinition, SheetSize } from '../types';

const NO_TRIM_SETTINGS: CuttingSettings = { sawKerf: 0, freshEdge: false, freshEdgeTrim: 0 };

function size(width: number, height: number, label = 'Sheet'): SheetSize {
  return { label, width, height };
}

function material(overrides: Partial<MaterialStock> = {}): MaterialStock {
  return {
    id: 'm1',
    name: 'Plywood',
    color: '#222222',
    size: size(1000, 1000),
    pricePerSheet: 100,
    ...overrides,
  };
}

function piece(overrides: Partial<PieceDefinition> = {}): PieceDefinition {
  return {
    id: 'p1',
    name: 'Piece',
    materialId: 'm1',
    width: 400,
    height: 300,
    quantity: 1,
    grain: 'none',
    rotationAllowed: true,
    priority: false,
    edgeBanding: { top: false, right: false, bottom: false, left: false },
    color: '#000000',
    ...overrides,
  };
}

describe('runOptimizer', () => {
  it('returns an empty result when there are no pieces', () => {
    const result = runOptimizer([], [material()], [], NO_TRIM_SETTINGS, 'maxrects');
    expect(result).toMatchObject({ sheets: [], unplacedPieces: [], totalWastePercent: 0, materialUsage: [], totalCost: 0 });
  });

  it('returns an empty result when there are no materials', () => {
    const result = runOptimizer([piece()], [], [], NO_TRIM_SETTINGS, 'maxrects');
    expect(result).toMatchObject({ sheets: [], unplacedPieces: [], materialUsage: [], totalCost: 0 });
  });

  it('places a piece that fits and reports waste and cost for the sheet', () => {
    const mat = material({ size: size(1000, 1000), pricePerSheet: 100 });
    const result = runOptimizer([piece({ materialId: mat.id, width: 400, height: 300 })], [mat], [], NO_TRIM_SETTINGS, 'maxrects');

    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].placedPieces).toHaveLength(1);
    expect(result.unplacedPieces).toEqual([]);
    // usableArea 1,000,000; placed area 120,000 -> wasted 880,000 -> 88%
    expect(result.totalWastePercent).toBe(88);
    expect(result.materialUsage).toEqual([{ materialId: mat.id, sheetCount: 1, cost: 100 }]);
    expect(result.totalCost).toBe(100);
  });

  it('marks a piece too large for the sheet as unplaced, without creating a phantom sheet', () => {
    const mat = material({ size: size(500, 500) });
    const result = runOptimizer([piece({ materialId: mat.id, width: 600, height: 600 })], [mat], [], NO_TRIM_SETTINGS, 'maxrects');

    expect(result.sheets).toEqual([]);
    expect(result.unplacedPieces).toEqual([{ definitionId: 'p1', instanceIndex: 0 }]);
    expect(result.materialUsage).toEqual([]);
  });

  it('spills extra pieces onto a second sheet once the first is full', () => {
    const mat = material({ size: size(500, 500) });
    // Three 400x400 pieces: only one fits per 500x500 sheet.
    const result = runOptimizer(
      [piece({ materialId: mat.id, width: 400, height: 400, quantity: 3 })],
      [mat],
      [],
      NO_TRIM_SETTINGS,
      'maxrects'
    );

    expect(result.sheets).toHaveLength(3);
    expect(result.sheets.every(s => s.placedPieces.length === 1)).toBe(true);
    expect(result.sheets.map(s => s.sheetIndex)).toEqual([0, 1, 2]);
    expect(result.materialUsage).toEqual([{ materialId: mat.id, sheetCount: 3, cost: 300 }]);
  });

  it('uses an offcut before cutting a fresh sheet, and excludes offcuts from cost', () => {
    const mat = material({ id: 'm1', size: size(1000, 1000), pricePerSheet: 100 });
    const offcuts: OffcutItem[] = [{ id: 'o1', materialId: 'm1', width: 500, height: 500, label: 'Scrap' }];
    const result = runOptimizer(
      [piece({ materialId: 'm1', width: 400, height: 400 })],
      [mat],
      offcuts,
      NO_TRIM_SETTINGS,
      'maxrects'
    );

    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].sourceOffcutId).toBe('o1');
    expect(result.sheets[0].width).toBe(500);
    // Offcut sheets are already-owned scrap and must not be billed.
    expect(result.materialUsage).toEqual([]);
    expect(result.totalCost).toBe(0);
  });

  it('skips an offcut too small for a piece without logging it as a used sheet', () => {
    const mat = material({ id: 'm1', size: size(1000, 1000), pricePerSheet: 100 });
    const offcuts: OffcutItem[] = [{ id: 'o1', materialId: 'm1', width: 300, height: 300, label: 'Scrap' }];
    const result = runOptimizer(
      [piece({ materialId: 'm1', width: 600, height: 600 })],
      [mat],
      offcuts,
      NO_TRIM_SETTINGS,
      'maxrects'
    );

    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].sourceOffcutId).toBeUndefined();
    expect(result.materialUsage).toEqual([{ materialId: 'm1', sheetCount: 1, cost: 100 }]);
  });

  it('packs pieces for each material onto that material\'s own sheets', () => {
    const matA = material({ id: 'ma', size: size(500, 500) });
    const matB = material({ id: 'mb', size: size(500, 500) });
    const pieces = [
      piece({ id: 'pa', materialId: 'ma', width: 400, height: 400 }),
      piece({ id: 'pb', materialId: 'mb', width: 400, height: 400 }),
    ];

    const result = runOptimizer(pieces, [matA, matB], [], NO_TRIM_SETTINGS, 'maxrects');

    expect(result.sheets).toHaveLength(2);
    expect(result.sheets.map(s => s.materialId).sort()).toEqual(['ma', 'mb']);
    expect(result.sheets.map(s => s.sheetIndex)).toEqual([0, 1]);
  });

  it('rotates a piece to make it fit when rotation is allowed and grain is none', () => {
    const mat = material({ size: size(500, 300) });
    // Fits only rotated: unrotated needs 250x450 (450 > 300 sheet height).
    const result = runOptimizer(
      [piece({ materialId: mat.id, width: 250, height: 450, grain: 'none', rotationAllowed: true })],
      [mat],
      [],
      NO_TRIM_SETTINGS,
      'maxrects'
    );

    expect(result.unplacedPieces).toEqual([]);
    expect(result.sheets[0].placedPieces[0].rotated).toBe(true);
  });

  it('does not rotate a grained piece even when rotationAllowed is true, leaving it unplaced if it only fits rotated', () => {
    const mat = material({ size: size(500, 300) });
    const result = runOptimizer(
      [piece({ materialId: mat.id, width: 250, height: 450, grain: 'vertical', rotationAllowed: true })],
      [mat],
      [],
      NO_TRIM_SETTINGS,
      'maxrects'
    );

    expect(result.sheets).toEqual([]);
    expect(result.unplacedPieces).toEqual([{ definitionId: 'p1', instanceIndex: 0 }]);
  });

  it('places a fitting piece with the easycut algorithm', () => {
    const mat = material({ size: size(1000, 1000) });
    const result = runOptimizer([piece({ materialId: mat.id, width: 400, height: 300 })], [mat], [], NO_TRIM_SETTINGS, 'easycut');

    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].placedPieces).toHaveLength(1);
    expect(result.unplacedPieces).toEqual([]);
  });

  it('shrinks the usable area by the fresh-edge trim on each side of a freshly cut sheet', () => {
    const mat = material({ size: size(1000, 1000) });
    const settings: CuttingSettings = { sawKerf: 0, freshEdge: true, freshEdgeTrim: 50 };
    const result = runOptimizer([piece({ materialId: mat.id, width: 100, height: 100 })], [mat], [], settings, 'maxrects');

    // (1000 - 2*50) * (1000 - 2*50) = 900 * 900 = 810,000
    expect(result.sheets[0].usableArea).toBe(810000);
  });
});
