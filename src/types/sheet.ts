export interface SheetSize {
  label: string;
  width: number;  // mm
  height: number; // mm
  custom?: boolean;
}

export interface SheetSettings {
  size: SheetSize;
  sawKerf: number;       // mm
  freshEdge: boolean;
  freshEdgeTrim: number; // mm trimmed from each side
}
