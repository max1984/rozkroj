import type { EdgeBanding, PieceDefinition } from '../types';

/**
 * Maps a piece's edge banding (defined on the unrotated part) onto the edges
 * as they appear once placed — rotating a part 90° cycles which physical
 * edge each banding flag refers to (original left edge becomes the top, etc).
 */
export function mapEdgeBandingForRotation(banding: EdgeBanding, rotated: boolean): EdgeBanding {
  if (!rotated) return banding;
  return { top: banding.left, right: banding.top, bottom: banding.right, left: banding.bottom };
}

export function edgeCount(banding: EdgeBanding): number {
  return Number(banding.top) + Number(banding.right) + Number(banding.bottom) + Number(banding.left);
}

/** Total linear length of edge banding needed across all pieces, in mm. */
export function totalBandingLengthMm(pieces: PieceDefinition[]): number {
  return pieces.reduce((sum, p) => {
    const perPiece =
      (p.edgeBanding.top ? p.width : 0) +
      (p.edgeBanding.bottom ? p.width : 0) +
      (p.edgeBanding.left ? p.height : 0) +
      (p.edgeBanding.right ? p.height : 0);
    return sum + perPiece * p.quantity;
  }, 0);
}
