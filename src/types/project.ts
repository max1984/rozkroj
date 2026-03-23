import type { SheetSettings } from './sheet';
import type { PieceDefinition } from './piece';

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  settings: SheetSettings;
  unit: 'mm' | 'inch';
  algorithm: 'maxrects' | 'easycut';
  pieces: PieceDefinition[];
}
