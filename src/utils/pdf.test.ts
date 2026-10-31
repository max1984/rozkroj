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
let textCalls: string[] = [];
vi.mock('jspdf', () => ({
  default: class {
    lastAutoTable = { finalY: 0 };
    setFontSize() {}
    setTextColor() {}
    setFillColor() {}
    setDrawColor() {}
    setLineWidth() {}
    text(s: string) { textCalls.push(s); }
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
    textCalls = [];
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

describe('generatePdf — edge banding total', () => {
  afterEach(() => {
    textCalls = [];
  });

  it(
    'regression: totalBandingLengthMm(project.pieces) counted the full requested quantity, including ' +
      "instances that didn't fit this run (layout.unplacedPieces) — the printed cut-list total was " +
      'inflated by exactly the tape those unplaced instances would have needed, same bug already fixed ' +
      'for the on-screen SummaryPanel but still present in the PDF (the actual cutting/ordering document)',
    async () => {
      const p = piece({ top: true, right: true, bottom: true, left: true });
      p.quantity = 2; // 2 requested, only 1 fits this run
      const layout: LayoutResult = {
        ...emptyLayout(),
        unplacedPieces: [{ definitionId: p.id, instanceIndex: 1 }],
      };
      await generatePdf(layout, project({ pieces: [p] }), false, 'New Project');

      // Fully banded 100x100 piece: 400mm/instance. 2 requested but only 1
      // placed — the printed total must reflect 400mm, not 800mm.
      const summaryLine = textCalls.find(s => s.includes('Edge banding:'));
      expect(summaryLine).toContain('400 mm');
      expect(summaryLine).not.toContain('800 mm');
    }
  );
});

describe('generatePdf — inch unit formatting', () => {
  afterEach(() => {
    textCalls = [];
  });

  it(
    'regression: printed inch values as plain 2-decimal numbers (e.g. "3.50\\"") instead of the ' +
      "fractional-inch format the on-screen piece list/summary already use (useUnitDisplay's " +
      '`format` -> formatDisplay -> toFractionalInch, nearest 1/32") — a shop using inches saw ' +
      'fractions everywhere on screen but decimals in the one document actually meant to be read ' +
      'with a tape measure at the saw',
    async () => {
      await generatePdf(
        emptyLayout(),
        project({ unit: 'inch', settings: { sawKerf: 88.9, freshEdge: false, freshEdgeTrim: 0 } }),
        false,
        'New Project'
      );
      const kerfLine = textCalls.find(s => s.startsWith('Kerf:'));
      expect(kerfLine).toContain('3 1/2"');
      expect(kerfLine).not.toContain('3.50"');
    }
  );
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
