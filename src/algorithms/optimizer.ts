import type { PieceDefinition, CuttingSettings, MaterialStock, OffcutItem, SheetSize, LayoutResult, SheetLayout, PlacedPiece, FreeRect, MaterialUsage } from '../types';
import { findBestPlacement, placePiece } from './maxRects';
import { MIN_OFFCUT_AREA } from '../constants/defaults';

interface PieceInstance {
  definitionId: string;
  instanceIndex: number;
  width: number;
  height: number;
  rotationAllowed: boolean;
  priority: boolean;
}

function expandPieces(pieces: PieceDefinition[]): PieceInstance[] {
  const instances: PieceInstance[] = [];
  for (const p of pieces) {
    for (let i = 0; i < p.quantity; i++) {
      instances.push({
        definitionId: p.id,
        instanceIndex: i,
        width: p.width,
        height: p.height,
        rotationAllowed: p.rotationAllowed && p.grain === 'none',
        priority: p.priority,
      });
    }
  }
  // Sort: priority first, then largest area first
  return instances.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    return (b.width * b.height) - (a.width * a.height);
  });
}

function initFreeRects(size: SheetSize, trim: number): FreeRect[] {
  const usableW = size.width - trim * 2;
  const usableH = size.height - trim * 2;
  return [{ x: trim, y: trim, width: usableW, height: usableH }];
}

function usableArea(size: SheetSize, trim: number): number {
  const usableW = size.width - trim * 2;
  const usableH = size.height - trim * 2;
  return usableW * usableH;
}

export function runOptimizer(
  pieces: PieceDefinition[],
  materials: MaterialStock[],
  offcutStock: OffcutItem[],
  settings: CuttingSettings,
  algorithm: 'maxrects' | 'easycut'
): LayoutResult {
  if (pieces.length === 0 || materials.length === 0) {
    return { sheets: [], unplacedPieces: [], totalWastePercent: 0, materialUsage: [], totalCost: 0, computedAt: Date.now() };
  }

  const allSheets: SheetLayout[] = [];
  const allUnplaced: { definitionId: string; instanceIndex: number }[] = [];
  let globalSheetIndex = 0;

  for (const material of materials) {
    const piecesForMaterial = pieces.filter(p => p.materialId === material.id);
    if (piecesForMaterial.length === 0) continue;

    const offcutsForMaterial = offcutStock.filter(o => o.materialId === material.id);

    const { sheets, unplaced, nextIndex } = packMaterial(
      piecesForMaterial,
      material,
      offcutsForMaterial,
      settings,
      algorithm,
      globalSheetIndex
    );
    allSheets.push(...sheets);
    allUnplaced.push(...unplaced);
    globalSheetIndex = nextIndex;
  }

  const totalUsable = allSheets.reduce((s, sh) => s + sh.usableArea, 0);
  const totalWasted = allSheets.reduce((s, sh) => s + sh.wastedArea, 0);

  const materialUsage: MaterialUsage[] = materials
    .map(m => {
      // Only freshly-cut sheets count against cost — offcuts are already-owned scrap.
      const sheetCount = allSheets.filter(s => s.materialId === m.id && !s.sourceOffcutId).length;
      return { materialId: m.id, sheetCount, cost: sheetCount * m.pricePerSheet };
    })
    .filter(u => u.sheetCount > 0);

  const totalCost = materialUsage.reduce((s, u) => s + u.cost, 0);

  return {
    sheets: allSheets,
    unplacedPieces: allUnplaced,
    totalWastePercent: totalUsable > 0 ? Math.round((totalWasted / totalUsable) * 100) : 0,
    materialUsage,
    totalCost,
    computedAt: Date.now(),
  };
}

interface Bin {
  size: SheetSize;
  trim: number;
  sourceOffcutId?: string;
}

/** Offcuts are tried first (smallest first, to use up scraps before larger stock), then fresh full sheets. */
function makeBinSupplier(material: MaterialStock, offcuts: OffcutItem[], settings: CuttingSettings) {
  const queue = [...offcuts].sort((a, b) => a.width * a.height - b.width * b.height);
  let i = 0;
  return (): Bin => {
    if (i < queue.length) {
      const o = queue[i++];
      return { size: { label: o.label, width: o.width, height: o.height }, trim: 0, sourceOffcutId: o.id };
    }
    return { size: material.size, trim: settings.freshEdge ? settings.freshEdgeTrim : 0 };
  };
}

function packMaterial(
  pieces: PieceDefinition[],
  material: MaterialStock,
  offcuts: OffcutItem[],
  settings: CuttingSettings,
  algorithm: 'maxrects' | 'easycut',
  startSheetIndex: number
): { sheets: SheetLayout[]; unplaced: { definitionId: string; instanceIndex: number }[]; nextIndex: number } {
  const instances = expandPieces(pieces);
  const unplaced: { definitionId: string; instanceIndex: number }[] = [];
  const sheets: SheetLayout[] = [];
  const nextBin = makeBinSupplier(material, offcuts, settings);

  let bin = nextBin();
  let freeRects: FreeRect[] = initFreeRects(bin.size, bin.trim);
  let placed: PlacedPiece[] = [];
  let sheetIndex = startSheetIndex;

  // Records the current bin as a sheet (if anything was placed on it) and pulls the next one.
  const advanceBin = () => {
    if (placed.length > 0) {
      const ua = usableArea(bin.size, bin.trim);
      const placedArea = placed.reduce((sum, p) => sum + p.width * p.height, 0);
      const wasted = ua - placedArea;
      const freeOffcuts = freeRects.filter(r => r.width * r.height >= MIN_OFFCUT_AREA);
      sheets.push({
        sheetIndex,
        materialId: material.id,
        sourceOffcutId: bin.sourceOffcutId,
        width: bin.size.width,
        height: bin.size.height,
        placedPieces: [...placed],
        freeRects: freeOffcuts,
        usableArea: ua,
        wastedArea: Math.max(0, wasted),
        wastePercent: ua > 0 ? Math.round((Math.max(0, wasted) / ua) * 100) : 0,
      });
      sheetIndex++;
    }
    bin = nextBin();
    freeRects = initFreeRects(bin.size, bin.trim);
    placed = [];
  };

  const tryPlace = (inst: PieceInstance): boolean => {
    if (algorithm === 'easycut') {
      return tryPlaceEasycut(inst, freeRects, placed, settings, sheetIndex);
    }
    const best = findBestPlacement(freeRects, inst.width, inst.height, inst.rotationAllowed, settings.sawKerf);
    if (!best) return false;
    const pw = best.rotated ? inst.height : inst.width;
    const ph = best.rotated ? inst.width : inst.height;
    freeRects = placePiece(freeRects, best.x, best.y, pw + settings.sawKerf, ph + settings.sawKerf);
    placed.push({ definitionId: inst.definitionId, instanceIndex: inst.instanceIndex, x: best.x, y: best.y, width: pw, height: ph, rotated: best.rotated, sheetIndex });
    return true;
  };

  for (const inst of instances) {
    // A bin too small for this instance is skipped (without being recorded as a used sheet)
    // until either it fits, or we reach an empty fresh full sheet — which means it never will.
    while (!tryPlace(inst)) {
      const binWasEmptyFreshSheet = placed.length === 0 && !bin.sourceOffcutId;
      if (binWasEmptyFreshSheet) {
        unplaced.push({ definitionId: inst.definitionId, instanceIndex: inst.instanceIndex });
        break;
      }
      advanceBin();
    }
  }

  advanceBin();

  return { sheets, unplaced, nextIndex: sheetIndex };
}

function tryPlaceEasycut(
  inst: PieceInstance,
  freeRects: FreeRect[],
  placed: PlacedPiece[],
  settings: CuttingSettings,
  sheetIndex: number
): boolean {
  // Simple row-by-row: find first free rect that fits
  const kerf = settings.sawKerf;
  for (const fr of freeRects) {
    const fitsNormal = fr.width >= inst.width + kerf && fr.height >= inst.height + kerf;
    const fitsRotated = inst.rotationAllowed && fr.width >= inst.height + kerf && fr.height >= inst.width + kerf;
    if (fitsNormal || fitsRotated) {
      const rotated = !fitsNormal && fitsRotated;
      const pw = rotated ? inst.height : inst.width;
      const ph = rotated ? inst.width : inst.height;
      // Place at top-left of free rect
      const newFree = placePiece(freeRects, fr.x, fr.y, pw + kerf, ph + kerf);
      freeRects.splice(0, freeRects.length, ...newFree);
      placed.push({ definitionId: inst.definitionId, instanceIndex: inst.instanceIndex, x: fr.x, y: fr.y, width: pw, height: ph, rotated, sheetIndex });
      return true;
    }
  }
  return false;
}
