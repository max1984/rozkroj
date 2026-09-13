import type { CuttingSettings } from './sheet';
import type { PieceDefinition } from './piece';
import type { MaterialStock, OffcutItem } from './material';

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  settings: CuttingSettings;
  materials: MaterialStock[];
  unit: 'mm' | 'inch';
  algorithm: 'maxrects' | 'easycut';
  pieces: PieceDefinition[];
  offcutStock: OffcutItem[];
}
