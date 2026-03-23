import type { PieceDefinition, SheetSettings, LayoutResult, SheetLayout, PlacedPiece, FreeRect } from '../types';
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

function initFreeRects(settings: SheetSettings): FreeRect[] {
  const trim = settings.freshEdge ? settings.freshEdgeTrim : 0;
  const usableW = settings.size.width - trim * 2;
  const usableH = settings.size.height - trim * 2;
  return [{ x: trim, y: trim, width: usableW, height: usableH }];
}

function usableArea(settings: SheetSettings): number {
  const trim = settings.freshEdge ? settings.freshEdgeTrim : 0;
  const usableW = settings.size.width - trim * 2;
  const usableH = settings.size.height - trim * 2;
  return usableW * usableH;
}

export function runOptimizer(
  pieces: PieceDefinition[],
  settings: SheetSettings,
  algorithm: 'maxrects' | 'easycut'
): LayoutResult {
  if (pieces.length === 0) {
    return { sheets: [], unplacedPieces: [], totalWastePercent: 0, computedAt: Date.now() };
  }

  const instances = expandPieces(pieces);
  const unplaced: { definitionId: string; instanceIndex: number }[] = [];
  const sheets: SheetLayout[] = [];
  let freeRects: FreeRect[] = initFreeRects(settings);
  let placed: PlacedPiece[] = [];
  let sheetIndex = 0;

  const finishSheet = () => {
    const ua = usableArea(settings);
    const placedArea = placed.reduce((sum, p) => sum + p.width * p.height, 0);
    const wasted = ua - placedArea;
    const offcuts = freeRects.filter(r => r.width * r.height >= MIN_OFFCUT_AREA);
    sheets.push({
      sheetIndex,
      placedPieces: [...placed],
      freeRects: offcuts,
      usableArea: ua,
      wastedArea: Math.max(0, wasted),
      wastePercent: ua > 0 ? Math.round((Math.max(0, wasted) / ua) * 100) : 0,
    });
    sheetIndex++;
    freeRects = initFreeRects(settings);
    placed = [];
  };

  for (const inst of instances) {
    let placedOnCurrent = false;

    if (algorithm === 'easycut') {
      placedOnCurrent = tryPlaceEasycut(inst, freeRects, placed, settings);
    } else {
      const best = findBestPlacement(freeRects, inst.width, inst.height, inst.rotationAllowed, settings.sawKerf);
      if (best) {
        const pw = best.rotated ? inst.height : inst.width;
        const ph = best.rotated ? inst.width : inst.height;
        freeRects = placePiece(freeRects, best.x, best.y, pw + settings.sawKerf, ph + settings.sawKerf);
        placed.push({ definitionId: inst.definitionId, instanceIndex: inst.instanceIndex, x: best.x, y: best.y, width: pw, height: ph, rotated: best.rotated, sheetIndex });
        placedOnCurrent = true;
      }
    }

    if (!placedOnCurrent) {
      if (placed.length > 0) {
        finishSheet();
        // try on new sheet
        const best = findBestPlacement(freeRects, inst.width, inst.height, inst.rotationAllowed, settings.sawKerf);
        if (best) {
          const pw = best.rotated ? inst.height : inst.width;
          const ph = best.rotated ? inst.width : inst.height;
          freeRects = placePiece(freeRects, best.x, best.y, pw + settings.sawKerf, ph + settings.sawKerf);
          placed.push({ definitionId: inst.definitionId, instanceIndex: inst.instanceIndex, x: best.x, y: best.y, width: pw, height: ph, rotated: best.rotated, sheetIndex });
        } else {
          unplaced.push({ definitionId: inst.definitionId, instanceIndex: inst.instanceIndex });
        }
      } else {
        unplaced.push({ definitionId: inst.definitionId, instanceIndex: inst.instanceIndex });
      }
    }
  }

  if (placed.length > 0) finishSheet();

  const totalUsable = sheets.reduce((s, sh) => s + sh.usableArea, 0);
  const totalWasted = sheets.reduce((s, sh) => s + sh.wastedArea, 0);

  return {
    sheets,
    unplacedPieces: unplaced,
    totalWastePercent: totalUsable > 0 ? Math.round((totalWasted / totalUsable) * 100) : 0,
    computedAt: Date.now(),
  };
}

function tryPlaceEasycut(
  inst: PieceInstance,
  freeRects: FreeRect[],
  placed: PlacedPiece[],
  settings: SheetSettings
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
      const i = freeRects.indexOf(fr);
      // Mutate in place (we pass freeRects by ref effectively via the outer scope)
      const newFree = placePiece(freeRects, fr.x, fr.y, pw + kerf, ph + kerf);
      freeRects.splice(0, freeRects.length, ...newFree);
      placed.push({ definitionId: inst.definitionId, instanceIndex: inst.instanceIndex, x: fr.x, y: fr.y, width: pw, height: ph, rotated, sheetIndex: placed[0]?.sheetIndex ?? 0 });
      void i;
      return true;
    }
  }
  return false;
}
