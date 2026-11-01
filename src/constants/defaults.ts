export const DEFAULT_SAW_KERF = 3;       // mm
export const DEFAULT_FRESH_EDGE_TRIM = 10; // mm per side
// expandPieces() in optimizer.ts loops `quantity` times per piece to build
// individual instances to pack — an unbounded value (a stray extra digit
// typed by hand, or a malformed/huge CSV cell) freezes the tab trying to
// allocate and pack millions of instances, with no feedback at all.
export const MAX_PIECE_QUANTITY = 1000;
// gridIntervalMm (canvasGrid.ts) caps the grid/ruler step at 200mm no matter
// how large the sheet is, so SheetCanvas's grid lines
// (Array.from({ length: Math.floor(sheetWidth / gridStep) + 1 })) and the PDF
// ruler's `for (let mm = 0; mm <= sheetW; mm += tickStep)` loop both grow
// linearly with the sheet's own size — unlike quantity above, there was no
// upper bound at all on a material's custom width/height (MaterialManager.tsx's
// onBlur only checked `w > 0`/`h > 0`, and migrateProject.ts's import guard
// only checked `> 0` too), so a stray extra digit (or a hand-edited/foreign
// project file) sizing a sheet at e.g. 999999999mm would try to render several
// million grid lines and freeze the tab, the same class of bug already fixed
// for piece quantity. 20m is far beyond any real sheet good (the largest
// standard entry here is ~3m) but still keeps the grid to ~100 lines.
export const MAX_SHEET_DIMENSION_MM = 20000;
// MAX_PIECE_QUANTITY above caps a SINGLE piece type's instance count, and
// MAX_SHEET_DIMENSION_MM caps a single sheet's own size — but neither caps
// how many sheets a whole project ends up needing, which is what actually
// drives pdf.ts's generatePdf() cost: its default (one page per sheet) export
// path calls doc.addPage()+drawSheet() once per `layout.sheets.length`, in a
// single synchronous loop with no yielding. Measured directly against the
// real jsPDF (not the mocked one pdf.test.ts uses): 1 000 sheets ≈ 66ms, but
// 20 000 ≈ 6.5s of a fully blocked tab — and 20 000 sheets is trivially
// reachable through totally ordinary UI use, with no CSV/import involved at
// all: just a few dozen piece types, each already at the legal
// MAX_PIECE_QUANTITY, that don't happen to pack efficiently together. Export
// refuses (with a warning instead of a multi-second freeze) above this many
// sheets; genuine jobs needing more than a couple thousand sheets of one
// material are not realistic.
export const MAX_PDF_SHEETS = 2000;
export const MIN_OFFCUT_AREA = 10000;     // mm² (~100×100mm) to be considered reusable
export const OFFCUT_STOCK_KEY = 'rozkroj_offcuts';
export const DARK_MODE_KEY = 'rozkroj_dark_mode';
export const LAST_UNIT_KEY = 'rozkroj_last_unit';
export const LANGUAGE_KEY = 'rozkroj_language';
export const DEFAULT_EDGE_BANDING = { top: false, right: false, bottom: false, left: false };
