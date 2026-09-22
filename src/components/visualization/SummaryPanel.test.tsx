// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SummaryPanel } from './SummaryPanel';
import type { LayoutResult, PieceDefinition, SheetLayout } from '../../types';

let layout: LayoutResult | null = null;
let pieces: PieceDefinition[] = [];

vi.mock('../../store', () => ({
  useStore: (selector: (s: { layout: LayoutResult | null; pieces: PieceDefinition[] }) => unknown) =>
    selector({ layout, pieces }),
}));

vi.mock('../../hooks/useUnitDisplay', () => ({
  useUnitDisplay: () => ({ format: (mm: number) => `${mm}mm` }),
}));

function sheet(overrides: Partial<SheetLayout> = {}): SheetLayout {
  return {
    sheetIndex: 0, materialId: 'm1', width: 1000, height: 1000,
    placedPieces: [], freeRects: [], usableArea: 1000000, wastedArea: 0, wastePercent: 0,
    ...overrides,
  };
}

function baseLayout(overrides: Partial<LayoutResult> = {}): LayoutResult {
  return {
    sheets: [sheet()], unplacedPieces: [], totalWastePercent: 10,
    materialUsage: [], totalCost: 0, computedAt: Date.now(),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  layout = null;
  pieces = [];
});

describe('SummaryPanel', () => {
  it('renders nothing when there is no layout', () => {
    const { container } = render(<SummaryPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the layout has no sheets', () => {
    layout = baseLayout({ sheets: [] });
    const { container } = render(<SummaryPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the fresh sheet count without an offcut suffix when there are no offcut sheets', () => {
    layout = baseLayout({ sheets: [sheet(), sheet({ sheetIndex: 1 })] });
    render(<SummaryPanel />);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('shows the offcut sheet count separately from fresh sheets', () => {
    layout = baseLayout({ sheets: [sheet(), sheet({ sheetIndex: 1, sourceOffcutId: 'o1' })] });
    render(<SummaryPanel />);
    expect(screen.getByText('1 +1 offcut')).toBeTruthy();
  });

  it('hides the material cost stat when totalCost is 0', () => {
    layout = baseLayout({ totalCost: 0 });
    render(<SummaryPanel />);
    expect(screen.queryByText('Material cost')).toBeNull();
  });

  it('shows the material cost stat when totalCost is positive', () => {
    layout = baseLayout({ totalCost: 123.456 });
    render(<SummaryPanel />);
    expect(screen.getByText('Material cost')).toBeTruthy();
    expect(screen.getByText('123.46')).toBeTruthy();
  });

  it('hides the unplaced stat when everything was placed', () => {
    layout = baseLayout({ unplacedPieces: [] });
    render(<SummaryPanel />);
    expect(screen.queryByText('Unplaced')).toBeNull();
  });

  it('shows the unplaced stat count when some pieces could not be placed', () => {
    layout = baseLayout({ unplacedPieces: [{ definitionId: 'p1', instanceIndex: 0 }, { definitionId: 'p2', instanceIndex: 0 }] });
    render(<SummaryPanel />);
    expect(screen.getByText('Unplaced')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('hides the edge banding stat when no piece has any banding', () => {
    layout = baseLayout();
    pieces = [{
      id: 'p1', name: 'A', materialId: 'm1', width: 100, height: 100, quantity: 1,
      grain: 'none', rotationAllowed: true, priority: false,
      edgeBanding: { top: false, right: false, bottom: false, left: false }, color: '#000',
    }];
    render(<SummaryPanel />);
    expect(screen.queryByText('Edge banding')).toBeNull();
  });

  it('shows the edge banding stat when a piece has banding', () => {
    layout = baseLayout();
    pieces = [{
      id: 'p1', name: 'A', materialId: 'm1', width: 100, height: 100, quantity: 1,
      grain: 'none', rotationAllowed: true, priority: false,
      edgeBanding: { top: true, right: false, bottom: false, left: false }, color: '#000',
    }];
    render(<SummaryPanel />);
    expect(screen.getByText('Edge banding')).toBeTruthy();
  });
});
