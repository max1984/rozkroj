import type { SheetSize } from './sheet';

export interface MaterialStock {
  id: string;
  name: string;
  color: string;
  size: SheetSize;
  pricePerSheet: number; // 0 = cost not tracked
}
