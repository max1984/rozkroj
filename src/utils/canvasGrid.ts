// Shared by SheetCanvas's blueprint grid lines and its bottom ruler ticks —
// both must use the SAME step for a given sheet width, or the ruler ends up
// showing tick marks (and labels) that don't line up with any grid line.
// They used to compute this independently (grid: 2 tiers off sheetWidth
// alone; ruler: 3 tiers, also off sheetWidth alone) and drifted apart for
// any sheet/offcut ≤1000mm wide, where the grid only drew lines every 100mm
// while the ruler ticked every 50mm.
export function gridIntervalMm(sheetWidthMm: number): number {
  if (sheetWidthMm > 2000) return 200;
  if (sheetWidthMm > 1000) return 100;
  return 50;
}
