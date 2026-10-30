export const DEFAULT_SAW_KERF = 3;       // mm
export const DEFAULT_FRESH_EDGE_TRIM = 10; // mm per side
// expandPieces() in optimizer.ts loops `quantity` times per piece to build
// individual instances to pack — an unbounded value (a stray extra digit
// typed by hand, or a malformed/huge CSV cell) freezes the tab trying to
// allocate and pack millions of instances, with no feedback at all.
export const MAX_PIECE_QUANTITY = 1000;
export const MIN_OFFCUT_AREA = 10000;     // mm² (~100×100mm) to be considered reusable
export const OFFCUT_STOCK_KEY = 'rozkroj_offcuts';
export const DARK_MODE_KEY = 'rozkroj_dark_mode';
export const LAST_UNIT_KEY = 'rozkroj_last_unit';
export const LANGUAGE_KEY = 'rozkroj_language';
export const DEFAULT_EDGE_BANDING = { top: false, right: false, bottom: false, left: false };
