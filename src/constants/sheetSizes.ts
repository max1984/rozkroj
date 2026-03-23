import type { SheetSize } from '../types';

export const STANDARD_SHEET_SIZES: SheetSize[] = [
  { label: '2440 × 1220 mm (8×4 ft)', width: 2440, height: 1220 },
  { label: '2500 × 1250 mm', width: 2500, height: 1250 },
  { label: '3050 × 1220 mm', width: 3050, height: 1220 },
  { label: '2800 × 2070 mm', width: 2800, height: 2070 },
  { label: '2440 × 1525 mm', width: 2440, height: 1525 },
  { label: '1220 × 610 mm (4×2 ft)', width: 1220, height: 610 },
  { label: 'Custom', width: 2440, height: 1220, custom: true },
];

export const DEFAULT_SHEET_SIZE = STANDARD_SHEET_SIZES[0];
