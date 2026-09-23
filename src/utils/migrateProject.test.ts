import { describe, expect, it } from 'vitest';
import { migrateProject } from './migrateProject';
import { DEFAULT_EDGE_BANDING, DEFAULT_MATERIAL_NAME } from '../constants/defaults';
import { STANDARD_SHEET_SIZES } from '../constants/sheetSizes';
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
    expect(result.materials[0].name).toBe(DEFAULT_MATERIAL_NAME);
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

  it('leaves a piece\'s materialId untouched when it matches an existing material', () => {
    const raw = {
      settings: {},
      materials: [currentMaterial({ id: 'm1' }), currentMaterial({ id: 'm2', name: 'MDF' })],
      pieces: [legacyPiece({ materialId: 'm2' })],
    } as unknown as Project;

    const result = migrateProject(raw);

    expect(result.pieces[0].materialId).toBe('m2');
  });
});
