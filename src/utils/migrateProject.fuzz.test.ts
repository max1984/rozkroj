import { describe, it, expect } from 'vitest';
import { migrateProject } from './migrateProject';
import { MAX_PIECE_QUANTITY, MAX_SHEET_DIMENSION_MM } from '../constants/defaults';
import type { Project, MaterialStock, PieceDefinition, OffcutItem } from '../types';

// Seeded PRNG (mulberry32) — deterministic, reproducible failures.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;
const VALID_GRAINS = new Set(['none', 'horizontal', 'vertical']);

function pick<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function randomId(rnd: () => number, dupPool: string[]): unknown {
  const choice = rnd();
  if (choice < 0.15 && dupPool.length) return pick(rnd, dupPool); // force a duplicate
  if (choice < 0.2) return '';   // falsy id
  if (choice < 0.25) return undefined;
  const id = `id-${Math.floor(rnd() * 1e9)}`;
  dupPool.push(id);
  return id;
}

function randomDimension(rnd: () => number): unknown {
  const choice = rnd();
  if (choice < 0.15) return -Math.floor(rnd() * 1000);
  if (choice < 0.3) return 0;
  if (choice < 0.4) return NaN;
  if (choice < 0.5) return undefined;
  if (choice < 0.55) return '500'; // stringly-typed
  if (choice < 0.6) return 1e9;    // absurdly huge
  return Math.floor(rnd() * 3000) + 1;
}

function randomBoolish(rnd: () => number): unknown {
  const choice = rnd();
  if (choice < 0.2) return true;
  if (choice < 0.4) return false;
  if (choice < 0.55) return 'true';
  if (choice < 0.7) return 'false';
  if (choice < 0.8) return undefined;
  if (choice < 0.9) return 'garbage';
  return 1; // truthy non-boolean
}

function randomEdgeBanding(rnd: () => number): unknown {
  const choice = rnd();
  if (choice < 0.2) return undefined;
  if (choice < 0.3) return 'not-an-object';
  if (choice < 0.4) return {};
  return {
    top: randomBoolish(rnd), right: randomBoolish(rnd),
    bottom: randomBoolish(rnd), left: randomBoolish(rnd),
  };
}

function randomColor(rnd: () => number): unknown {
  const choice = rnd();
  if (choice < 0.3) return '#aabbcc';
  if (choice < 0.4) return undefined;
  if (choice < 0.5) return 'red';
  if (choice < 0.6) return '#zzzzzz';
  return 12345;
}

function randomGrain(rnd: () => number): unknown {
  const choice = rnd();
  if (choice < 0.4) return pick(rnd, ['none', 'horizontal', 'vertical']);
  if (choice < 0.6) return undefined;
  if (choice < 0.8) return 'diagonal';
  return 7;
}

function randomSize(rnd: () => number) {
  const choice = rnd();
  if (choice < 0.3) return { label: 'Custom', width: randomDimension(rnd), height: randomDimension(rnd), custom: true };
  if (choice < 0.4) return undefined;
  if (choice < 0.5) return {};
  return { label: 'X', width: randomDimension(rnd), height: randomDimension(rnd) };
}

function randomProject(rnd: () => number) {
  const materialIdPool: string[] = [];
  const pieceIdPool: string[] = [];
  const offcutIdPool: string[] = [];

  const materialCount = Math.floor(rnd() * 5);
  const materials = Array.from({ length: materialCount }, () => ({
    id: randomId(rnd, materialIdPool),
    name: 'M',
    color: randomColor(rnd),
    size: randomSize(rnd),
    pricePerSheet: randomDimension(rnd),
  }));

  // materialId a piece/offcut might reference — mix of real ones (from the
  // pool above, possibly before dedup) and completely dangling references.
  function someMaterialIdRef(): unknown {
    if (materialIdPool.length && rnd() < 0.6) return pick(rnd, materialIdPool);
    if (rnd() < 0.5) return 'dangling-ref';
    return undefined;
  }

  const pieceCount = Math.floor(rnd() * 7);
  const pieces = Array.from({ length: pieceCount }, () => ({
    id: randomId(rnd, pieceIdPool),
    name: 'P',
    materialId: someMaterialIdRef(),
    width: randomDimension(rnd),
    height: randomDimension(rnd),
    quantity: randomDimension(rnd),
    grain: randomGrain(rnd),
    rotationAllowed: randomBoolish(rnd),
    priority: randomBoolish(rnd),
    edgeBanding: randomEdgeBanding(rnd),
    color: randomColor(rnd),
  }));

  const offcutCount = Math.floor(rnd() * 5);
  const offcutStock = Array.from({ length: offcutCount }, () => ({
    id: randomId(rnd, offcutIdPool),
    materialId: someMaterialIdRef(),
    width: randomDimension(rnd),
    height: randomDimension(rnd),
    label: 'O',
  }));

  const settingsChoice = rnd();
  const settings = settingsChoice < 0.15 ? undefined : settingsChoice < 0.25 ? {} : {
    sawKerf: randomDimension(rnd),
    freshEdge: randomBoolish(rnd),
    freshEdgeTrim: randomDimension(rnd),
  };

  return {
    id: 'proj-1',
    name: 'Fuzzed',
    createdAt: 0,
    updatedAt: 0,
    materials,
    pieces,
    offcutStock,
    settings,
    unit: pick(rnd, ['mm', 'inch', 'cubit', undefined]),
    algorithm: pick(rnd, ['maxrects', 'easycut', 'bogus', undefined]),
  } as unknown as Project;
}

describe('migrateProject fuzzing — combinatorial corruption (complements the per-field unit tests)', () => {
  const FUZZ_RUNS = 300;
  const rnd = mulberry32(20261118);

  for (let run = 0; run < FUZZ_RUNS; run++) {
    it(`survives combinatorially-corrupted input #${run}`, () => {
      const raw = randomProject(rnd);
      const rawSnapshot = JSON.stringify(raw);

      let result!: ReturnType<typeof migrateProject>;
      expect(() => { result = migrateProject(raw); }).not.toThrow();

      // migrateProject() must not mutate its input.
      expect(JSON.stringify(raw)).toBe(rawSnapshot);

      const materialIds = new Set(result.materials.map((m: MaterialStock) => m.id));

      // Invariant: always at least one material.
      expect(result.materials.length).toBeGreaterThan(0);

      // Invariant: no duplicate ids within any of the three arrays.
      expect(materialIds.size).toBe(result.materials.length);
      expect(new Set(result.pieces.map((p: PieceDefinition) => p.id)).size).toBe(result.pieces.length);
      expect(new Set(result.offcutStock.map((o: OffcutItem) => o.id)).size).toBe(result.offcutStock.length);

      for (const m of result.materials) {
        expect(Number.isFinite(m.size.width)).toBe(true);
        expect(m.size.width).toBeGreaterThan(0);
        expect(m.size.width).toBeLessThanOrEqual(MAX_SHEET_DIMENSION_MM);
        expect(Number.isFinite(m.size.height)).toBe(true);
        expect(m.size.height).toBeGreaterThan(0);
        expect(m.size.height).toBeLessThanOrEqual(MAX_SHEET_DIMENSION_MM);
        expect(Number.isFinite(m.pricePerSheet)).toBe(true);
        expect(m.pricePerSheet).toBeGreaterThanOrEqual(0);
      }

      for (const p of result.pieces) {
        expect(materialIds.has(p.materialId)).toBe(true);
        expect(Number.isFinite(p.width)).toBe(true);
        expect(p.width).toBeGreaterThan(0);
        expect(Number.isFinite(p.height)).toBe(true);
        expect(p.height).toBeGreaterThan(0);
        expect(Number.isInteger(p.quantity)).toBe(true);
        expect(p.quantity).toBeGreaterThanOrEqual(1);
        expect(p.quantity).toBeLessThanOrEqual(MAX_PIECE_QUANTITY);
        expect(VALID_GRAINS.has(p.grain)).toBe(true);
        expect(HEX_COLOR_RE.test(p.color)).toBe(true);
        expect(typeof p.rotationAllowed).toBe('boolean');
        expect(typeof p.priority).toBe('boolean');
        expect(typeof p.edgeBanding.top).toBe('boolean');
        expect(typeof p.edgeBanding.right).toBe('boolean');
        expect(typeof p.edgeBanding.bottom).toBe('boolean');
        expect(typeof p.edgeBanding.left).toBe('boolean');
      }

      for (const o of result.offcutStock) {
        expect(materialIds.has(o.materialId)).toBe(true);
        expect(Number.isFinite(o.width)).toBe(true);
        expect(o.width).toBeGreaterThan(0);
        expect(Number.isFinite(o.height)).toBe(true);
        expect(o.height).toBeGreaterThan(0);
      }

      expect(Number.isFinite(result.settings.sawKerf)).toBe(true);
      expect(result.settings.sawKerf).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(result.settings.freshEdgeTrim)).toBe(true);
      expect(result.settings.freshEdgeTrim).toBeGreaterThanOrEqual(0);
      expect(typeof result.settings.freshEdge).toBe('boolean');

      expect(['mm', 'inch']).toContain(result.unit);
      expect(['maxrects', 'easycut']).toContain(result.algorithm);
    });
  }
});
