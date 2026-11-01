import { nanoid } from 'nanoid';
import type { CuttingSettings, MaterialStock, PieceDefinition, Project } from '../types';
import { DEFAULT_SHEET_SIZE, STANDARD_SHEET_SIZES } from '../constants/sheetSizes';
import { DEFAULT_SAW_KERF, DEFAULT_FRESH_EDGE_TRIM, MAX_PIECE_QUANTITY, MAX_SHEET_DIMENSION_MM } from '../constants/defaults';
import { getPieceColor } from './colors';
import { getInitialLanguage } from './languagePreference';
import { TRANSLATIONS } from '../i18n';

const VALID_GRAINS = new Set<PieceDefinition['grain']>(['none', 'horizontal', 'vertical']);

/**
 * Both the manual add-piece form (checkbox inputs) and the CSV importer
 * (`row['RotationAllowed']?.toLowerCase() !== 'false'` / `row['Priority']?.toLowerCase() === 'true'`)
 * guarantee rotationAllowed/priority are always real booleans by the time a
 * piece reaches the store — but a project file loaded via "Import project
 * file" skips both of those and goes straight from JSON.parse into the
 * store with no such guard. A hand-edited or foreign-tool-exported file can
 * carry the STRING "false" instead of the boolean `false` for either field.
 * JS treats any non-empty string as truthy, so optimizer.ts's
 * `p.rotationAllowed && p.grain === 'none'` and its `a.priority !== b.priority`
 * sort comparator would both silently treat that string "false" as true —
 * the exact opposite of what the file says — with no error or warning.
 */
function coerceBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
  }
  return defaultValue;
}

/**
 * Same stringly-typed-boolean gap as coerceBoolean above, but for
 * edgeBanding's four per-edge flags. The manual form (EdgeBandingPicker's
 * `onChange: (value: EdgeBanding) => void`, toggled via `!value[key]`) and
 * the CSV importer (edgesFromString's `set.has(...)`, a Set membership test)
 * both guarantee every one of top/right/bottom/left is a real boolean — but
 * `p.edgeBanding ?? DEFAULT_EDGE_BANDING` only ever replaced the WHOLE
 * object when missing entirely, never validating the individual flags on an
 * object that IS present. A hand-edited project file with
 * `"top": "false"` would have that key stay the literal string "false" —
 * truthy in JS, so edgeBanding.ts's `p.edgeBanding.top ? p.width : 0`
 * (totalBandingLengthMm, used by both SummaryPanel and the cut-list PDF)
 * silently counted banding tape for an edge the file says has none, and
 * edgeCount()'s `Number(banding.top)` (PieceRow's ▭ indicator) produces NaN
 * for any non-boolean value, which propagates through the `+` sum and makes
 * `edgeCount(...) > 0` false even when other edges genuinely have banding.
 */
function coerceEdgeBanding(value: unknown): PieceDefinition['edgeBanding'] {
  const v = (value ?? {}) as Partial<PieceDefinition['edgeBanding']>;
  return {
    top: coerceBoolean(v.top, false),
    right: coerceBoolean(v.right, false),
    bottom: coerceBoolean(v.bottom, false),
    left: coerceBoolean(v.left, false),
  };
}

/**
 * Same JSON.parse-skips-the-guards class as every field above, but for
 * CuttingSettings instead of a piece/material field: KerfSettings.tsx's
 * sawKerf/freshEdgeTrim inputs only ever commit a finite, non-negative
 * number onBlur (see its own comment), and freshEdge is a button toggle
 * that only ever flips a real boolean — but a project file loaded via
 * "Import project file" skips all three of those guards and goes straight
 * from JSON.parse into the store. Unlike a material-specific field (size,
 * pricePerSheet), sawKerf/freshEdge/freshEdgeTrim are GLOBAL settings
 * shared by every material: maxRects.ts adds sawKerf straight onto every
 * piece's effective width/height (`pieceW + sawKerf`), so a non-finite or
 * negative value there poisons every placement check for EVERY material at
 * once, silently sending every single piece to "Unplaced" with nothing
 * pointing at the real cause. And a stringly-typed `"false"` for freshEdge
 * is truthy in JS, so optimizer.ts's `settings.freshEdge ? settings.freshEdgeTrim : 0`
 * would apply a trim the file explicitly said should be off — the exact
 * same boolean-inversion class coerceBoolean above already guards for
 * rotationAllowed/priority, just never extended to this field.
 */
function coerceSettings(value: unknown): CuttingSettings {
  const v = (value ?? {}) as Partial<CuttingSettings>;
  const sawKerf = Number.isFinite(v.sawKerf) && (v.sawKerf as number) >= 0 ? (v.sawKerf as number) : DEFAULT_SAW_KERF;
  const freshEdgeTrim = Number.isFinite(v.freshEdgeTrim) && (v.freshEdgeTrim as number) >= 0
    ? (v.freshEdgeTrim as number)
    : DEFAULT_FRESH_EDGE_TRIM;
  return {
    sawKerf,
    freshEdge: coerceBoolean(v.freshEdge, false),
    freshEdgeTrim,
  };
}

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
  // Same JSON.parse-skips-the-guards class as the piece-level fields below, but for a
  // material's sheet size: MaterialManager.tsx's custom-size inputs only ever commit a
  // width/height onBlur when `w > 0`/`h > 0` (and the standard-size <select> only ever
  // offers the fixed, valid entries in STANDARD_SHEET_SIZES), so a non-finite, negative or
  // zero size.width/height can only ever reach this point via a hand-edited or corrupted
  // project file. Left unvalidated, it flows straight into optimizer.ts's
  // initFreeRects()/usableArea(), making every free rect on that material's sheets NaN- or
  // negative-sized — not a crash (NaN/negative comparisons just make every piece assigned to
  // that material fail to place, exactly like an oversized piece does), but every one of
  // those pieces would silently end up in "Unplaced" with nothing pointing at the real cause,
  // and MaterialManager's own header line (`{format(size.width)} × {format(size.height)}`)
  // would literally render "NaN mm × NaN mm". Falls back to DEFAULT_SHEET_SIZE rather than
  // dropping the material — unlike an invalid piece dimension, a material can't be silently
  // dropped without also orphaning every piece/offcut that references it.
  const materials = project.materials.map(m => {
    const matchedSize = STANDARD_SHEET_SIZES.find(
      s => s.width === m.size?.width && s.height === m.size?.height && !m.size?.custom
    );
    // Same unbounded-dimension gap as MaterialManager.tsx's custom width/height
    // onBlur (now also upper-bounded) — this is the OTHER entry point for a
    // material size, and only ever checked `> 0`, never an upper bound. A
    // hand-edited or corrupted project file with a sheet size in, say, the
    // billions would otherwise flow straight into SheetCanvas's grid-line
    // Array.from()/the PDF ruler's loop (both stepped no coarser than 200mm
    // regardless of sheet size — see MAX_SHEET_DIMENSION_MM's own comment) and
    // freeze the tab trying to render millions of lines.
    const hasValidSize =
      Number.isFinite(m.size?.width) && (m.size?.width ?? 0) > 0 && (m.size?.width ?? 0) <= MAX_SHEET_DIMENSION_MM &&
      Number.isFinite(m.size?.height) && (m.size?.height ?? 0) > 0 && (m.size?.height ?? 0) <= MAX_SHEET_DIMENSION_MM;
    const size = matchedSize ?? (hasValidSize ? m.size : DEFAULT_SHEET_SIZE);
    // Same JSON.parse-skips-the-guards class as size.width/height above, but for
    // pricePerSheet: MaterialManager.tsx's price input already guards against a
    // non-numeric value on blur (`isNaN(parsed) ? 0 : parsed`), and addMaterial
    // always seeds a real `0` — but a project file loaded via "Import project
    // file" (hand-edited, corrupted, or from a pre-pricePerSheet legacy save
    // where the field never existed) skips that guard entirely. Unlike a bad
    // sheet size (which only poisons the pieces assigned to THAT material),
    // `undefined`/NaN/negative here poisons optimizer.ts's
    // `cost: sheetCount * m.pricePerSheet` for this material, and that NaN then
    // propagates through `totalCost = materialUsage.reduce((s, u) => s + u.cost, 0)`
    // — silently blanking the cost summary for the WHOLE project, not just the
    // material with the bad value.
    const pricePerSheet = Number.isFinite(m.pricePerSheet) && m.pricePerSheet >= 0 ? m.pricePerSheet : 0;
    return { ...m, size, pricePerSheet };
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
      edgeBanding: coerceEdgeBanding(p.edgeBanding),
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
      // Same JSON.parse-skips-the-guards class as grain/quantity above, but
      // for these two booleans — see coerceBoolean's comment. Defaults match
      // PieceForm's own `useState(editing?.rotationAllowed ?? true)` /
      // `useState(editing?.priority ?? false)` for a field that's missing
      // entirely, not just malformed.
      rotationAllowed: coerceBoolean(p.rotationAllowed, true),
      priority: coerceBoolean(p.priority, false),
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

  const settings = coerceSettings(project.settings);

  return { ...project, materials, pieces, offcutStock, settings };
}
