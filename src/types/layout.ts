export interface PlacedPiece {
  definitionId: string;
  instanceIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  sheetIndex: number;
}

export interface FreeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SheetLayout {
  sheetIndex: number;
  placedPieces: PlacedPiece[];
  freeRects: FreeRect[];
  usableArea: number;
  wastedArea: number;
  wastePercent: number;
}

export interface LayoutResult {
  sheets: SheetLayout[];
  unplacedPieces: { definitionId: string; instanceIndex: number }[];
  totalWastePercent: number;
  computedAt: number;
}
