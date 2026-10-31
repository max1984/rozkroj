import { nanoid } from 'nanoid';
import type { MaterialStock, PieceDefinition, Project } from '../types';
import { DEFAULT_SHEET_SIZE, STANDARD_SHEET_SIZES } from '../constants/sheetSizes';
import { DEFAULT_EDGE_BANDING, MAX_PIECE_QUANTITY } from '../constants/defaults';
import { getPieceColor } from './colors';
import { getInitialLanguage } from './languagePreference';
import { TRANSLATIONS } from '../i18n';

const VALID_GRAINS = new Set<PieceDefinition['grain']>(['none', 'horizontal', 'vertical']);

interface LegacyProject {
  settings?: { size?: { label: string; width: number; height: number; custom?: boolean } };
  materials?: MaterialStock[];
  pieces?: (PieceDefinition & { materialId?: string })[];
  offcutStock?: Project['offcutStock'];
}

function defaultMaterial(): MaterialStock {
  const language = getInitialLanguage();
  return {
    id: nanoid(),
    name: (TRANSLATIONS[language] ?? TRANSLATIONS.en).defaultMaterialName,
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
  // Both the manual add-piece form (PieceForm's handleSubmit) and the CSV
  // importer reject a piece whose width/height isn't a finite positive
  // number before it ever reaches the store — but a project file loaded via
  // "Import project file" (hand-edited, corrupted, or shared by someone
  // else) skips both of those and goes straight from JSON.parse into the
  // store with no such guard. Unlike quantity (which has a sane fallback of
  // 1), there's no sensible width/height to default to — a piece with a
  // NaN/negative/zero dimension has no actual size to cut, so it's dropped
  // instead of kept around with a 1×1mm sliver the optimizer would place
  // somewhere, or a negative size rendered incorrectly in the cut list and
  // on the sheet canvas.
  const pieces = (project.pieces ?? [])
    .filter(p => Number.isFinite(p.width) && p.width > 0 && Number.isFinite(p.height) && p.height > 0)
    .map(p => ({
      ...p,
      materialId: materialIds.has(p.materialId) ? p.materialId : materials[0].id,
      edgeBanding: p.edgeBanding ?? DEFAULT_EDGE_BANDING,
      // Same class of gap as quantity/width/height above: csv.ts's importer
      // already rejects a Grain cell outside the 'none'|'horizontal'|
      // 'vertical' union (falling back to 'none'), because the TS cast it
      // used to do (`row['Grain'] as PieceDefinition['grain']`) only checks
      // at compile time — but a project file loaded via "Import project
      // file" skips that importer entirely and goes straight from
      // JSON.parse into the store with no such guard. An unrecognized value
      // doesn't crash anything (optimizer.ts's `grain === 'none'` treats any
      // non-'none' string the same way, safely forcing rotationAllowed:
      // false), but PieceForm.tsx's <select> has no matching <option> for
      // it, so editing that piece silently shows the dropdown as blank.
      grain: VALID_GRAINS.has(p.grain) ? p.grain : 'none',
      // Both the manual add-piece form and the CSV importer clamp quantity to
      // MAX_PIECE_QUANTITY (see its own comment: optimizer.ts's expandPieces()
      // loops `quantity` times per piece, so an unbounded value freezes the
      // tab) — but a project file loaded via "Import project file" (hand-
      // edited, corrupted, or shared by someone else) skipped both of those
      // and went straight from JSON.parse into the store with no such guard,
      // same dangling-reference risk this function already migrates for
      // materialId/edgeBanding above, just for the numeric field those two
      // other entry points already protect.
      quantity: Number.isFinite(p.quantity) && p.quantity > 0
        ? Math.min(Math.round(p.quantity), MAX_PIECE_QUANTITY)
        : 1,
    }));

  // Same dangling-reference risk as pieces above, but an offcut can't be
  // reassigned the same way: a piece is still something the user wants cut
  // and can sensibly inherit the fallback material, while an offcut is
  // scrap left over from a SPECIFIC board — cross-assigning it to
  // materials[0] would offer it up as stock of a material it was never
  // actually cut from. Dropping the orphaned entry instead avoids both the
  // optimizer silently ignoring stock (OffcutStock.filter(o => o.materialId
  // === material.id) never matches) that the OffcutStock panel still shows
  // as available (it isn't filtered there), and misrepresenting its
  // material.
  const offcutStock = (project.offcutStock ?? []).filter(o => materialIds.has(o.materialId));

  return { ...project, materials, pieces, offcutStock };
}
