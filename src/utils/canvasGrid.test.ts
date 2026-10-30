import { describe, it, expect } from 'vitest';
import { gridIntervalMm } from './canvasGrid';

describe('gridIntervalMm', () => {
  it('ticks every 50mm for sheets/offcuts up to 1000mm wide', () => {
    expect(gridIntervalMm(1)).toBe(50);
    expect(gridIntervalMm(600)).toBe(50);
    expect(gridIntervalMm(1000)).toBe(50);
  });

  it('ticks every 100mm between 1000mm and 2000mm', () => {
    expect(gridIntervalMm(1001)).toBe(100);
    expect(gridIntervalMm(1500)).toBe(100);
    expect(gridIntervalMm(2000)).toBe(100);
  });

  it('ticks every 200mm above 2000mm', () => {
    expect(gridIntervalMm(2001)).toBe(200);
    expect(gridIntervalMm(3000)).toBe(200);
  });
});
