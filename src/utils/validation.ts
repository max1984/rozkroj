/**
 * Parses a form field into a positive integer, or null if it isn't one.
 * An optional `max` also rejects anything above it (the caller decides
 * whether that means "don't submit" or "clamp and warn" — see
 * MAX_PIECE_QUANTITY's call sites).
 */
export function parsePositiveInt(raw: string, max = Infinity): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  const n = parseInt(raw, 10);
  return n > 0 && n <= max ? n : null;
}
