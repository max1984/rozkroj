import Papa from 'papaparse';
import type { PieceDefinition, MaterialStock } from '../types';
import { toMm } from './units';
import { getPieceColor } from './colors';
import { parsePositiveInt } from './validation';
import { MAX_PIECE_QUANTITY } from '../constants/defaults';
import { nanoid } from 'nanoid';

/**
 * Neutralizes CSV/formula injection: spreadsheet apps (Excel, Sheets) treat a
 * cell starting with =, +, -, @, tab, or CR as a formula, which lets a
 * crafted piece/material name (e.g. from a shared project file) run
 * arbitrary commands when the exported CSV is later opened by someone else.
 * Prefixing with a single quote forces it to be read as literal text.
 */
export function sanitizeCsvField(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

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
    Name: sanitizeCsvField(p.name),
    Material: sanitizeCsvField(materialMap.get(p.materialId) ?? ''),
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
  // Some browsers (older Firefox/Safari) read the blob asynchronously after
  // the click, so revoking the URL synchronously right after can race the
  // read and silently abort the download — defer it a tick instead.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const VALID_GRAINS = new Set<PieceDefinition['grain']>(['none', 'horizontal', 'vertical']);

export function importCsv(
  file: File,
  unit: 'mm' | 'inch',
  existingCount: number,
  materials: MaterialStock[],
  onDone: (pieces: PieceDefinition[], unmatchedMaterialCount: number, invalidDimensionCount: number, invalidGrainCount: number, excessiveQuantityCount: number) => void,
  onError: (msg: string) => void,
  parseErrorMessage: string
): void {
  const defaultMaterialId = materials[0]?.id ?? '';
  const byName = new Map(materials.map(m => [m.name.toLowerCase(), m.id]));

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (result) => {
      try {
        const csvUnit = detectUnitFromHeaders(result.meta.fields, unit);
        let unmatchedMaterialCount = 0;
        let invalidDimensionCount = 0;
        let invalidGrainCount = 0;
        let excessiveQuantityCount = 0;
        const pieces: PieceDefinition[] = [];
        (result.data as Record<string, string>[]).forEach((row, i) => {
          const name = row['Name'] || `Piece ${existingCount + i + 1}`;
          const widthRaw = parseFloat(Object.values(row).find((_, k) => Object.keys(row)[k].toLowerCase().includes('width')) ?? '0');
          const heightRaw = parseFloat(Object.values(row).find((_, k) => Object.keys(row)[k].toLowerCase().includes('height')) ?? '0');
          // A non-numeric or zero/negative cell would otherwise silently become a
          // piece the optimizer can never place, with no indication to the user
          // that the row was dropped (NaN/0 comparisons in the packer are just
          // always false, so the piece vanishes from the layout instead of erroring).
          if (!Number.isFinite(widthRaw) || widthRaw <= 0 || !Number.isFinite(heightRaw) || heightRaw <= 0) {
            invalidDimensionCount++;
            return;
          }
          const materialCell = row['Material'] || '';
          const matchedId = byName.get(materialCell.toLowerCase());
          // A non-empty Material cell that matches nothing (typo, or a name
          // from a different project) would otherwise silently land on
          // whatever material happens to be first, with no indication to
          // the user that the assignment didn't actually come from the file.
          if (materialCell && !matchedId) unmatchedMaterialCount++;
          const materialId = matchedId ?? defaultMaterialId;
          // An unrecognized Grain cell (typo, different app's export, hand-edited
          // file) used to be cast straight through with `as PieceDefinition['grain']`
          // — TypeScript's cast is compile-time only, so at runtime the piece
          // silently carried a value outside the type's actual union. Nothing
          // crashed (optimizer.ts's `grain === 'none'` check just treats any
          // unrecognized string the same as "has grain"), but PieceForm.tsx's
          // <select> then showed no option selected for that piece with no
          // explanation, unlike its two siblings right here (unmatched material,
          // invalid dimension) which already warn instead of failing silently.
          const grainRaw = (row['Grain'] || '').trim().toLowerCase();
          let grain: PieceDefinition['grain'] = 'none';
          if (grainRaw) {
            if (VALID_GRAINS.has(grainRaw as PieceDefinition['grain'])) {
              grain = grainRaw as PieceDefinition['grain'];
            } else {
              invalidGrainCount++;
            }
          }
          pieces.push({
            id: nanoid(),
            name,
            materialId,
            width: toMm(widthRaw, csvUnit),
            height: toMm(heightRaw, csvUnit),
            // Same rule as the manual add-piece form: a non-integer or missing
            // cell used to reach parseInt() directly, which produced NaN (not
            // the same gap as a missing column, which legitimately defaults to 1).
            // A WILDLY excessive one (typo'd extra digit, hand-edited/foreign
            // export) is clamped rather than dropped to 1 like a genuinely
            // unparseable cell — the row still gets a usable, placeable
            // quantity instead of losing almost all of it — but still counted
            // so the user knows the file asked for more than this clamp allows
            // (expandPieces() in optimizer.ts loops `quantity` times per piece;
            // unclamped, a huge value freezes the tab trying to pack it).
            quantity: (() => {
              const n = parsePositiveInt(row['Quantity'] ?? '');
              if (n !== null && n > MAX_PIECE_QUANTITY) {
                excessiveQuantityCount++;
                return MAX_PIECE_QUANTITY;
              }
              return n ?? 1;
            })(),
            grain,
            rotationAllowed: row['RotationAllowed']?.toLowerCase() !== 'false',
            priority: row['Priority']?.toLowerCase() === 'true',
            edgeBanding: edgesFromString(row['EdgeBanding']),
            color: getPieceColor(existingCount + i),
          });
        });
        onDone(pieces, unmatchedMaterialCount, invalidDimensionCount, invalidGrainCount, excessiveQuantityCount);
      } catch {
        onError(parseErrorMessage);
      }
    },
    // Surfaced as a plain alert() to the user (see PieceList.tsx) — the
    // only other file-reading error path in this app, useLocalStorage.ts's
    // project-JSON import, never shows the raw browser/library error
    // message either, just a friendly translated string. err.message here
    // was the one place that still leaked an untranslated, raw message.
    error: () => onError(parseErrorMessage),
  });
}
