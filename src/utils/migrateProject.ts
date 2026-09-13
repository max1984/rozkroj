import { nanoid } from 'nanoid';
import type { MaterialStock, PieceDefinition, Project } from '../types';
import { DEFAULT_SHEET_SIZE, STANDARD_SHEET_SIZES } from '../constants/sheetSizes';
import { DEFAULT_MATERIAL_NAME } from '../constants/defaults';
import { getPieceColor } from './colors';

interface LegacyProject {
  settings?: { size?: { label: string; width: number; height: number; custom?: boolean } };
  materials?: MaterialStock[];
  pieces?: (PieceDefinition & { materialId?: string })[];
}

function defaultMaterial(): MaterialStock {
  return {
    id: nanoid(),
    name: DEFAULT_MATERIAL_NAME,
    color: getPieceColor(0),
    size: DEFAULT_SHEET_SIZE,
    pricePerSheet: 0,
  };
}

/** Upgrades a project saved before multi-material support (single global sheet size) to the current shape. */
export function migrateProject(raw: LegacyProject & Project): Project {
  let project = raw;

  if (!raw.materials || raw.materials.length === 0) {
    const legacySize = raw.settings?.size ?? DEFAULT_SHEET_SIZE;
    const material = defaultMaterial();
    material.size = legacySize;
    project = {
      ...raw,
      materials: [material],
      pieces: (raw.pieces ?? []).map(p => ({ ...p, materialId: p.materialId ?? material.id })),
    };
  }

  // Re-link standard sheet sizes so edits to STANDARD_SHEET_SIZES propagate.
  project.materials = project.materials.map(m => {
    const matchedSize = STANDARD_SHEET_SIZES.find(
      s => s.width === m.size.width && s.height === m.size.height && !m.size.custom
    );
    return matchedSize ? { ...m, size: matchedSize } : m;
  });

  return project;
}
