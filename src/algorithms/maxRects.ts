import type { FreeRect } from '../types';
import type { Rect } from '../utils/geometry';

interface Placement {
  x: number;
  y: number;
  rotated: boolean;
  score: number;
}

function scoreRect(fr: FreeRect, w: number, h: number): number {
  // Best Short Side Fit: minimize shorter leftover dimension
  const leftoverH = fr.width - w;
  const leftoverV = fr.height - h;
  return Math.min(leftoverH, leftoverV);
}

function splitFreeRect(fr: FreeRect, placed: Rect): FreeRect[] {
  const result: FreeRect[] = [];
  if (placed.x < fr.x + fr.width && placed.x + placed.width > fr.x) {
    if (placed.y > fr.y) {
      result.push({ x: fr.x, y: fr.y, width: fr.width, height: placed.y - fr.y });
    }
    if (placed.y + placed.height < fr.y + fr.height) {
      result.push({ x: fr.x, y: placed.y + placed.height, width: fr.width, height: fr.y + fr.height - (placed.y + placed.height) });
    }
  }
  if (placed.y < fr.y + fr.height && placed.y + placed.height > fr.y) {
    if (placed.x > fr.x) {
      result.push({ x: fr.x, y: fr.y, width: placed.x - fr.x, height: fr.height });
    }
    if (placed.x + placed.width < fr.x + fr.width) {
      result.push({ x: placed.x + placed.width, y: fr.y, width: fr.x + fr.width - (placed.x + placed.width), height: fr.height });
    }
  }
  return result;
}

function isContained(a: FreeRect, b: FreeRect): boolean {
  return b.x <= a.x && b.y <= a.y &&
    b.x + b.width >= a.x + a.width &&
    b.y + b.height >= a.y + a.height;
}

function pruneFreeRects(freeRects: FreeRect[]): FreeRect[] {
  return freeRects.filter((a, i) =>
    !freeRects.some((b, j) => i !== j && isContained(a, b))
  );
}

export function findBestPlacement(
  freeRects: FreeRect[],
  pieceW: number,
  pieceH: number,
  rotationAllowed: boolean,
  sawKerf: number
): Placement | null {
  let best: Placement | null = null;

  const tryPlace = (w: number, h: number, rotated: boolean) => {
    for (const fr of freeRects) {
      if (fr.width >= w && fr.height >= h) {
        const score = scoreRect(fr, w, h);
        if (best === null || score < best.score) {
          best = { x: fr.x, y: fr.y, rotated, score };
        }
      }
    }
  };

  const ew = pieceW + sawKerf;
  const eh = pieceH + sawKerf;
  tryPlace(ew, eh, false);
  if (rotationAllowed && pieceW !== pieceH) {
    tryPlace(eh, ew, true);
  }

  return best;
}

export function placePiece(
  freeRects: FreeRect[],
  x: number,
  y: number,
  w: number,
  h: number
): FreeRect[] {
  const placed: Rect = { x, y, width: w, height: h };
  let newFreeRects: FreeRect[] = [];

  for (const fr of freeRects) {
    const frRect: Rect = { x: fr.x, y: fr.y, width: fr.width, height: fr.height };
    const overlapsX = placed.x < frRect.x + frRect.width && placed.x + placed.width > frRect.x;
    const overlapsY = placed.y < frRect.y + frRect.height && placed.y + placed.height > frRect.y;
    if (overlapsX && overlapsY) {
      newFreeRects.push(...splitFreeRect(fr, placed));
    } else {
      newFreeRects.push(fr);
    }
  }

  return pruneFreeRects(newFreeRects);
}
