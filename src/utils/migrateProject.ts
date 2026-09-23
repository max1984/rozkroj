import { nanoid } from 'nanoid';
import type { MaterialStock, PieceDefinition, Project } from '../types';
import { DEFAULT_SHEET_SIZE, STANDARD_SHEET_SIZES } from '../constants/sheetSizes';
import { DEFAULT_MATERIAL_NAME, DEFAULT_EDGE_BANDING } from '../constants/defaults';
import { getPieceColor } from './colors';

interface LegacyProject {
  settings?: { size?: { label: string; width: number; height: number; custom?: boolean } };
  materials?: MaterialStock[];
  pieces?: (PieceDefinition & { materialId?: string })[];
  offcutStock?: Project['offcutStock'];
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
  let project: Project = raw;

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
  const materials = project.materials.map(m => {
    const matchedSize = STANDARD_SHEET_SIZES.find(
      s => s.width === m.size.width && s.height === m.size.height && !m.size.custom
    );
    return matchedSize ? { ...m, size: matchedSize } : m;
  });

  // A piece referencing a material that no longer exists (corrupted or hand-edited
  // save, or materials trimmed independently) would otherwise be silently dropped
  // from every sheet by the optimizer, with no unplaced-piece warning to explain why.
  const materialIds = new Set(materials.map(m => m.id));
  const pieces = project.pieces.map(p => ({
    ...p,
    materialId: materialIds.has(p.materialId) ? p.materialId : materials[0].id,
    edgeBanding: p.edgeBanding ?? DEFAULT_EDGE_BANDING,
  }));

  return { ...project, materials, pieces, offcutStock: project.offcutStock ?? [] };
}
