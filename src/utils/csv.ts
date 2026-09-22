import Papa from 'papaparse';
import type { PieceDefinition, MaterialStock } from '../types';
import { toMm } from './units';
import { getPieceColor } from './colors';
import { nanoid } from 'nanoid';

export function edgesToString(p: PieceDefinition): string {
  const edges: string[] = [];
  if (p.edgeBanding.top) edges.push('top');
  if (p.edgeBanding.right) edges.push('right');
  if (p.edgeBanding.bottom) edges.push('bottom');
  if (p.edgeBanding.left) edges.push('left');
  return edges.join('+');
}

export function edgesFromString(value: string | undefined): PieceDefinition['edgeBanding'] {
  const set = new Set((value ?? '').toLowerCase().split('+').map(s => s.trim()));
  return { top: set.has('top'), right: set.has('right'), bottom: set.has('bottom'), left: set.has('left') };
}

/**
 * exportCsv labels its width/height columns with the unit they were written in
 * (e.g. "Width (inch)"). Reading that back off the header — rather than trusting
 * whatever unit the app happens to be displaying at import time — means a file
 * exported in mm still imports correctly even if the app has since switched to
 * inches, and vice versa.
 */
export function detectUnitFromHeaders(fields: string[] | undefined, fallback: 'mm' | 'inch'): 'mm' | 'inch' {
  const widthField = fields?.find(f => f.toLowerCase().includes('width'));
  if (!widthField) return fallback;
  const lower = widthField.toLowerCase();
  if (lower.includes('inch')) return 'inch';
  if (lower.includes('mm')) return 'mm';
  return fallback;
}

export function exportCsv(pieces: PieceDefinition[], materials: MaterialStock[], unit: 'mm' | 'inch'): void {
  const materialMap = new Map(materials.map(m => [m.id, m.name]));
  const rows = pieces.map(p => ({
    Name: p.name,
    Material: materialMap.get(p.materialId) ?? '',
    [`Width (${unit})`]: unit === 'inch' ? (p.width / 25.4).toFixed(4) : p.width,
    [`Height (${unit})`]: unit === 'inch' ? (p.height / 25.4).toFixed(4) : p.height,
    Quantity: p.quantity,
    Grain: p.grain,
    RotationAllowed: p.rotationAllowed,
    Priority: p.priority,
    EdgeBanding: edgesToString(p),
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
  materials: MaterialStock[],
  onDone: (pieces: PieceDefinition[]) => void,
  onError: (msg: string) => void
): void {
  const defaultMaterialId = materials[0]?.id ?? '';
  const byName = new Map(materials.map(m => [m.name.toLowerCase(), m.id]));

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (result) => {
      try {
        const csvUnit = detectUnitFromHeaders(result.meta.fields, unit);
        const pieces: PieceDefinition[] = (result.data as Record<string, string>[]).map((row, i) => {
          const name = row['Name'] || `Piece ${existingCount + i + 1}`;
          const widthRaw = parseFloat(Object.values(row).find((_, k) => Object.keys(row)[k].toLowerCase().includes('width')) ?? '0');
          const heightRaw = parseFloat(Object.values(row).find((_, k) => Object.keys(row)[k].toLowerCase().includes('height')) ?? '0');
          const materialId = byName.get((row['Material'] || '').toLowerCase()) ?? defaultMaterialId;
          return {
            id: nanoid(),
            name,
            materialId,
            width: toMm(widthRaw, csvUnit),
            height: toMm(heightRaw, csvUnit),
            quantity: parseInt(row['Quantity'] || '1', 10),
            grain: (row['Grain'] as PieceDefinition['grain']) || 'none',
            rotationAllowed: row['RotationAllowed']?.toLowerCase() !== 'false',
            priority: row['Priority']?.toLowerCase() === 'true',
            edgeBanding: edgesFromString(row['EdgeBanding']),
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
