/** Parses a form field into a positive integer, or null if it isn't one. */
export function parsePositiveInt(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  const n = parseInt(raw, 10);
  return n > 0 ? n : null;
}
