import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { migrateProject } from './migrateProject';
import { DEFAULT_EDGE_BANDING } from '../constants/defaults';
import { STANDARD_SHEET_SIZES } from '../constants/sheetSizes';
import { TRANSLATIONS } from '../i18n';

// defaultMaterial() falls back to the OS locale via navigator.language when
// nothing is stored, which would make this file's assertions depend on the
// machine running the suite (e.g. 'pl-PL') without this stub.
beforeEach(() => {
  vi.stubGlobal('navigator', { language: 'en-US' });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
import type { MaterialStock, PieceDefinition, Project } from '../types';

function legacyPiece(overrides: Partial<PieceDefinition> = {}): PieceDefinition {
  return {
    id: 'p1',
    name: 'Shelf',
    materialId: '',
    width: 600,
    height: 400,
    quantity: 1,
    grain: 'none',
    rotationAllowed: true,
    priority: false,
    edgeBanding: undefined as unknown as PieceDefinition['edgeBanding'],
    color: '#111111',
    ...overrides,
  };
}

function currentMaterial(overrides: Partial<MaterialStock> = {}): MaterialStock {
  return {
    id: 'm1',
    name: 'Plywood',
    color: '#222222',
    size: { label: 'Custom', width: 1000, height: 500, custom: true },
    pricePerSheet: 0,
    ...overrides,
  };
}

describe('migrateProject', () => {
  it('creates a default material from the legacy single sheet size when materials are missing', () => {
    const fullPiece = legacyPiece() as unknown as Record<string, unknown>;
    delete fullPiece.materialId;
    const pieceWithoutMaterialId = fullPiece as unknown as PieceDefinition;
    const raw = {
      settings: { size: { label: 'Legacy', width: 2000, height: 1000 } },
      pieces: [pieceWithoutMaterialId],
    } as unknown as Project;

    const result = migrateProject(raw);

    expect(result.materials).toHaveLength(1);
    expect(result.materials[0].name).toBe(TRANSLATIONS.en.defaultMaterialName);
    expect(result.materials[0].size).toEqual({ label: 'Legacy', width: 2000, height: 1000 });
    expect(result.pieces[0].materialId).toBe(result.materials[0].id);
  });

  it('does not mutate the raw input object', () => {
    const raw = {
      settings: {},
      materials: [currentMaterial()],
      pieces: [legacyPiece({ materialId: 'm1' })],
    } as unknown as Project;
    const rawSnapshot = JSON.parse(JSON.stringify(raw));

    migrateProject(raw);

    expect(raw).toEqual(rawSnapshot);
  });

  it('backfills missing edgeBanding on legacy pieces with the default', () => {
    const raw = {
      settings: {},
      materials: [currentMaterial()],
      pieces: [legacyPiece({ materialId: 'm1' })],
    } as unknown as Project;

    const result = migrateProject(raw);

    expect(result.pieces[0].edgeBanding).toEqual(DEFAULT_EDGE_BANDING);
  });

  it('preserves edgeBanding already present on a piece', () => {
    const banding = { top: true, right: false, bottom: true, left: false };
    const raw = {
      settings: {},
      materials: [currentMaterial()],
      pieces: [legacyPiece({ materialId: 'm1', edgeBanding: banding })],
    } as unknown as Project;

    const result = migrateProject(raw);

    expect(result.pieces[0].edgeBanding).toEqual(banding);
  });

  it('defaults offcutStock to an empty array when missing', () => {
    const raw = {
      settings: {},
      materials: [currentMaterial()],
      pieces: [],
    } as unknown as Project;

    const result = migrateProject(raw);

    expect(result.offcutStock).toEqual([]);
  });

  it('preserves an existing offcutStock array', () => {
    const offcut = { id: 'o1', materialId: 'm1', width: 100, height: 100, label: 'Scrap' };
    const raw = {
      settings: {},
      materials: [currentMaterial()],
      pieces: [],
      offcutStock: [offcut],
    } as unknown as Project;

    const result = migrateProject(raw);

    expect(result.offcutStock).toEqual([offcut]);
  });

  it('relinks a material size matching a standard size so future edits propagate', () => {
    const standard = STANDARD_SHEET_SIZES[0];
    const raw = {
      settings: {},
      materials: [currentMaterial({ size: { label: standard.label, width: standard.width, height: standard.height } })],
      pieces: [],
    } as unknown as Project;

    const result = migrateProject(raw);

    expect(result.materials[0].size).toBe(standard);
  });

  it('leaves a custom material size untouched even if dimensions match a standard size', () => {
    const standard = STANDARD_SHEET_SIZES[0];
    const customSize = { label: 'My custom', width: standard.width, height: standard.height, custom: true };
    const raw = {
      settings: {},
      materials: [currentMaterial({ size: customSize })],
      pieces: [],
    } as unknown as Project;

    const result = migrateProject(raw);

    expect(result.materials[0].size).toEqual(customSize);
    expect(result.materials[0].size).not.toBe(standard);
  });

  it('reassigns a piece whose materialId matches no material to the first material, instead of leaving it orphaned', () => {
    const raw = {
      settings: {},
      materials: [currentMaterial({ id: 'm1' })],
      pieces: [legacyPiece({ materialId: 'deleted-material-id' })],
    } as unknown as Project;

    const result = migrateProject(raw);

    expect(result.pieces[0].materialId).toBe('m1');
  });

  it('does not throw when materials are present but pieces is missing entirely (LegacyProject marks it optional)', () => {
    const raw = {
      settings: {},
      materials: [currentMaterial()],
    } as unknown as Project;

    const result = migrateProject(raw);

    expect(result.pieces).toEqual([]);
  });

  it('drops an offcutStock entry whose materialId matches no material, instead of leaving it orphaned', () => {
    const validOffcut = { id: 'o1', materialId: 'm1', width: 100, height: 100, label: 'Scrap' };
    const orphanOffcut = { id: 'o2', materialId: 'deleted-material-id', width: 200, height: 200, label: 'Scrap' };
    const raw = {
      settings: {},
      materials: [currentMaterial({ id: 'm1' })],
      pieces: [],
      offcutStock: [validOffcut, orphanOffcut],
    } as unknown as Project;

    const result = migrateProject(raw);

    expect(result.offcutStock).toEqual([validOffcut]);
  });

  it('leaves a piece\'s materialId untouched when it matches an existing material', () => {
    const raw = {
      settings: {},
      materials: [currentMaterial({ id: 'm1' }), currentMaterial({ id: 'm2', name: 'MDF' })],
      pieces: [legacyPiece({ materialId: 'm2' })],
    } as unknown as Project;

    const result = migrateProject(raw);

    expect(result.pieces[0].materialId).toBe('m2');
  });

  it(
    'clamps an excessive piece quantity from an imported project file, matching the manual ' +
      'form and CSV importer — otherwise optimizer.ts\'s expandPieces() loops that many times ' +
      'and freezes the tab',
    () => {
      const raw = {
        settings: {},
        materials: [currentMaterial()],
        pieces: [legacyPiece({ quantity: 999999999 })],
      } as unknown as Project;

      const result = migrateProject(raw);

      expect(result.pieces[0].quantity).toBe(1000);
    }
  );

  it('falls back a non-finite or non-positive imported quantity to 1, same as a missing CSV cell', () => {
    const raw = {
      settings: {},
      materials: [currentMaterial()],
      pieces: [
        legacyPiece({ id: 'p1', quantity: NaN }),
        legacyPiece({ id: 'p2', quantity: -5 }),
        legacyPiece({ id: 'p3', quantity: 0 }),
      ],
    } as unknown as Project;

    const result = migrateProject(raw);

    expect(result.pieces.map(p => p.quantity)).toEqual([1, 1, 1]);
  });

  it(
    'drops an imported piece whose width or height is non-finite, negative or zero, matching the manual ' +
      'form and CSV importer — unlike quantity there is no sane dimension to fall back to',
    () => {
      const raw = {
        settings: {},
        materials: [currentMaterial()],
        pieces: [
          legacyPiece({ id: 'ok', width: 600, height: 400 }),
          legacyPiece({ id: 'nan-width', width: NaN, height: 400 }),
          legacyPiece({ id: 'negative-height', width: 600, height: -100 }),
          legacyPiece({ id: 'zero-width', width: 0, height: 400 }),
        ],
      } as unknown as Project;

      const result = migrateProject(raw);

      expect(result.pieces.map(p => p.id)).toEqual(['ok']);
    }
  );

  it(
    'falls back an imported piece\'s unrecognized Grain value to \'none\', matching the CSV importer — ' +
      'otherwise PieceForm\'s <select> has no matching <option> and silently renders blank',
    () => {
      const raw = {
        settings: {},
        materials: [currentMaterial()],
        pieces: [legacyPiece({ grain: 'diagonal' as unknown as PieceDefinition['grain'] })],
      } as unknown as Project;

      const result = migrateProject(raw);

      expect(result.pieces[0].grain).toBe('none');
    }
  );

  it('leaves a piece\'s valid Grain value untouched', () => {
    const raw = {
      settings: {},
      materials: [currentMaterial()],
      pieces: [legacyPiece({ grain: 'horizontal' })],
    } as unknown as Project;

    const result = migrateProject(raw);

    expect(result.pieces[0].grain).toBe('horizontal');
  });

  it(
    'coerces a stringly-typed rotationAllowed/priority from an imported project file to a real boolean, ' +
      'matching the manual form (checkbox) and CSV importer — otherwise optimizer.ts\'s truthy checks ' +
      'treat the literal string "false" as true, the opposite of what the file says',
    () => {
      const raw = {
        settings: {},
        materials: [currentMaterial()],
        pieces: [
          legacyPiece({
            id: 'p1',
            rotationAllowed: 'false' as unknown as boolean,
            priority: 'true' as unknown as boolean,
          }),
        ],
      } as unknown as Project;

      const result = migrateProject(raw);

      expect(result.pieces[0].rotationAllowed).toBe(false);
      expect(result.pieces[0].priority).toBe(true);
    }
  );

  it('falls back a non-boolean, non-"true"/"false" rotationAllowed/priority to their usual defaults', () => {
    const raw = {
      settings: {},
      materials: [currentMaterial()],
      pieces: [
        legacyPiece({
          id: 'p1',
          rotationAllowed: null as unknown as boolean,
          priority: 1 as unknown as boolean,
        }),
      ],
    } as unknown as Project;

    const result = migrateProject(raw);

    expect(result.pieces[0].rotationAllowed).toBe(true);
    expect(result.pieces[0].priority).toBe(false);
  });

  it('leaves already-boolean rotationAllowed/priority values untouched', () => {
    const raw = {
      settings: {},
      materials: [currentMaterial()],
      pieces: [legacyPiece({ rotationAllowed: false, priority: true })],
    } as unknown as Project;

    const result = migrateProject(raw);

    expect(result.pieces[0].rotationAllowed).toBe(false);
    expect(result.pieces[0].priority).toBe(true);
  });

  it(
    'coerces stringly-typed edgeBanding flags from an imported project file to real booleans, ' +
      'matching the manual form and CSV importer — otherwise edgeBanding.ts\'s truthy checks ' +
      '(totalBandingLengthMm, used by SummaryPanel and the cut-list PDF) treat the literal ' +
      'string "false" as true, the opposite of what the file says',
    () => {
      const raw = {
        settings: {},
        materials: [currentMaterial()],
        pieces: [
          legacyPiece({
            edgeBanding: {
              top: 'false',
              right: 'true',
              bottom: false,
              left: true,
            } as unknown as PieceDefinition['edgeBanding'],
          }),
        ],
      } as unknown as Project;

      const result = migrateProject(raw);

      expect(result.pieces[0].edgeBanding).toEqual({ top: false, right: true, bottom: false, left: true });
    }
  );

  it('falls back a non-boolean, non-"true"/"false" edgeBanding flag to false, and fills in flags missing from a partial object', () => {
    const raw = {
      settings: {},
      materials: [currentMaterial()],
      pieces: [
        legacyPiece({
          edgeBanding: { top: 1, right: true } as unknown as PieceDefinition['edgeBanding'],
        }),
      ],
    } as unknown as Project;

    const result = migrateProject(raw);

    expect(result.pieces[0].edgeBanding).toEqual({ top: false, right: true, bottom: false, left: false });
  });
});
