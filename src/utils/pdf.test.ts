import { afterEach, describe, expect, it, vi } from 'vitest';
import { edgesLabel, generatePdf } from './pdf';
import type { LayoutResult, PieceDefinition, Project } from '../types';

function piece(edgeBanding: PieceDefinition['edgeBanding']): PieceDefinition {
  return {
    id: 'p1', name: 'Piece', materialId: 'm1', width: 100, height: 100, quantity: 1,
    grain: 'none', rotationAllowed: true, priority: false, edgeBanding, color: '#000000',
  };
}

// generatePdf() only ever reaches jsPDF/autoTable through their public API
// (text/rect/line/addPage/save, …) — stub those instead of letting the real
// libraries render, so these tests exercise generatePdf()'s OWN logic
// (filename, table rows, sheet layout math) without needing a real canvas.
let savedFilename = '';
vi.mock('jspdf', () => ({
  default: class {
    lastAutoTable = { finalY: 0 };
    setFontSize() {}
    setTextColor() {}
    setFillColor() {}
    setDrawColor() {}
    setLineWidth() {}
    text() {}
    rect() {}
    line() {}
    addPage() {}
    save(filename: string) { savedFilename = filename; }
  },
}));
vi.mock('jspdf-autotable', () => ({ default: () => {} }));

function emptyLayout(): LayoutResult {
  return { sheets: [], unplacedPieces: [], totalWastePercent: 0, materialUsage: [], totalCost: 0, computedAt: 0 };
}

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj1', name: 'My Project', createdAt: 0, updatedAt: 0,
    settings: { sawKerf: 3, freshEdge: false, freshEdgeTrim: 0 },
    materials: [{ id: 'm1', name: 'Chipboard', color: '#000', size: { label: 'Sheet', width: 2440, height: 1220 }, pricePerSheet: 0 }],
    unit: 'mm', algorithm: 'maxrects', pieces: [], offcutStock: [],
    ...overrides,
  };
}

describe('generatePdf — exported filename', () => {
  afterEach(() => {
    savedFilename = '';
  });

  it('names the file after the project', async () => {
    await generatePdf(emptyLayout(), project({ name: 'My Project' }), false, 'New Project');
    expect(savedFilename).toBe('My_Project-cutlist.pdf');
  });

  it(
    'regression: falls back to the default project name instead of an empty-name filename — ' +
      "same bug class as useLocalStorage.ts's exportToFile, Toolbar's rename field has no " +
      'minimum-length validation so projectName can be blank mid-edit',
    async () => {
      await generatePdf(emptyLayout(), project({ name: '' }), false, 'New Project');
      expect(savedFilename).toBe('New_Project-cutlist.pdf');
    }
  );

  it('also falls back for a whitespace-only name', async () => {
    await generatePdf(emptyLayout(), project({ name: '   ' }), false, 'New Project');
    expect(savedFilename).toBe('New_Project-cutlist.pdf');
  });
});

describe('edgesLabel', () => {
  it('returns an empty string when no edges are banded', () => {
    expect(edgesLabel(piece({ top: false, right: false, bottom: false, left: false }))).toBe('');
  });

  it('returns single-letter codes in top/right/bottom/left order', () => {
    expect(edgesLabel(piece({ top: true, right: false, bottom: true, left: true }))).toBe('TBL');
  });

  it('returns all four letters when fully banded', () => {
    expect(edgesLabel(piece({ top: true, right: true, bottom: true, left: true }))).toBe('TRBL');
  });
});
