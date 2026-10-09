const MM_PER_INCH = 25.4;

export function toMm(value: number, unit: 'mm' | 'inch'): number {
  if (unit === 'inch') return Math.round(value * MM_PER_INCH * 10) / 10;
  return value;
}

export function fromMm(value: number, unit: 'mm' | 'inch'): number {
  if (unit === 'inch') return value / MM_PER_INCH;
  return value;
}

function toFractionalInch(inches: number): string {
  // Rounds to the nearest 1/32" and simplifies via gcd (e.g. 4/32 -> 1/8) —
  // a loop trying coarser denominators first (16, 8, 4, 2) used to sit here,
  // but every one of those is unreachable: the first iteration (32) always
  // either breaks (n === 0) or returns, via gcd-simplification, the exact
  // same fraction a coarser denominator would have produced.
  const DENOMINATOR = 32;
  const whole = Math.floor(inches);
  const frac = inches - whole;
  const n = Math.round(frac * DENOMINATOR);
  if (n === 0) return `${whole}"`;
  if (n === DENOMINATOR) return `${whole + 1}"`;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(n, DENOMINATOR);
  const num = n / g;
  const den = DENOMINATOR / g;
  return whole > 0 ? `${whole} ${num}/${den}"` : `${num}/${den}"`;
}

export function formatDisplay(mm: number, unit: 'mm' | 'inch'): string {
  if (unit === 'inch') return toFractionalInch(mm / MM_PER_INCH);
  return `${mm} mm`;
}

export function formatInputValue(mm: number, unit: 'mm' | 'inch'): string {
  if (unit === 'inch') return (mm / MM_PER_INCH).toFixed(4).replace(/\.?0+$/, '');
  return String(mm);
}
