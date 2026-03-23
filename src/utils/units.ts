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
  const denominators = [32, 16, 8, 4, 2];
  const whole = Math.floor(inches);
  const frac = inches - whole;
  for (const d of denominators) {
    const n = Math.round(frac * d);
    if (n === 0) break;
    if (n === d) return `${whole + 1}"`;
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const g = gcd(n, d);
    const num = n / g;
    const den = d / g;
    return whole > 0 ? `${whole} ${num}/${den}"` : `${num}/${den}"`;
  }
  return `${whole}"`;
}

export function formatDisplay(mm: number, unit: 'mm' | 'inch'): string {
  if (unit === 'inch') return toFractionalInch(mm / MM_PER_INCH);
  return `${mm} mm`;
}

export function formatInputValue(mm: number, unit: 'mm' | 'inch'): string {
  if (unit === 'inch') return (mm / MM_PER_INCH).toFixed(4).replace(/\.?0+$/, '');
  return String(mm);
}
