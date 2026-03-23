import Papa from 'papaparse';
import type { PieceDefinition } from '../types';
import { toMm } from './units';
import { getPieceColor } from './colors';
import { nanoid } from 'nanoid';

export function exportCsv(pieces: PieceDefinition[], unit: 'mm' | 'inch'): void {
  const rows = pieces.map(p => ({
    Name: p.name,
    [`Width (${unit})`]: unit === 'inch' ? (p.width / 25.4).toFixed(4) : p.width,
    [`Height (${unit})`]: unit === 'inch' ? (p.height / 25.4).toFixed(4) : p.height,
    Quantity: p.quantity,
    Grain: p.grain,
    RotationAllowed: p.rotationAllowed,
    Priority: p.priority,
  }));
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cut-list.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function importCsv(
  file: File,
  unit: 'mm' | 'inch',
  existingCount: number,
  onDone: (pieces: PieceDefinition[]) => void,
  onError: (msg: string) => void
): void {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (result) => {
      try {
        const pieces: PieceDefinition[] = (result.data as Record<string, string>[]).map((row, i) => {
          const name = row['Name'] || `Piece ${existingCount + i + 1}`;
          const widthRaw = parseFloat(Object.values(row).find((_, k) => Object.keys(row)[k].toLowerCase().includes('width')) ?? '0');
          const heightRaw = parseFloat(Object.values(row).find((_, k) => Object.keys(row)[k].toLowerCase().includes('height')) ?? '0');
          return {
            id: nanoid(),
            name,
            width: toMm(widthRaw, unit),
            height: toMm(heightRaw, unit),
            quantity: parseInt(row['Quantity'] || '1', 10),
            grain: (row['Grain'] as PieceDefinition['grain']) || 'none',
            rotationAllowed: row['RotationAllowed']?.toLowerCase() !== 'false',
            priority: row['Priority']?.toLowerCase() === 'true',
            color: getPieceColor(existingCount + i),
          };
        });
        onDone(pieces);
      } catch {
        onError('Failed to parse CSV. Check column names.');
      }
    },
    error: (err) => onError(err.message),
  });
}
