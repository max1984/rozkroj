// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LayoutViewer } from './LayoutViewer';
import type { LayoutResult, MaterialStock, PieceDefinition, SheetLayout } from '../../types';

let layout: LayoutResult | null = null;
let pieces: PieceDefinition[] = [];
const materials: MaterialStock[] = [
  { id: 'm1', name: 'Chipboard', color: '#4e79a7', size: { label: 'Sheet', width: 2440, height: 1220 }, pricePerSheet: 0 },
  { id: 'm2', name: 'MDF', color: '#f28e2b', size: { label: 'Sheet', width: 2440, height: 1220 }, pricePerSheet: 0 },
];

vi.mock('../../store', () => ({
  useStore: (selector: (s: { layout: LayoutResult | null; materials: MaterialStock[]; pieces: PieceDefinition[] }) => unknown) =>
    selector({ layout, materials, pieces }),
}));

// SheetCanvas renders a real Konva <Stage>, which needs a canvas backend
// jsdom doesn't provide — stub it out to isolate LayoutViewer's own logic
// (sheet navigation, waste display, unplaced-pieces banner).
vi.mock('./SheetCanvas', () => ({
  SheetCanvas: ({ sheetWidth, sheetHeight }: { sheetWidth: number; sheetHeight: number }) => (
    <div data-testid="sheet-canvas">{sheetWidth}x{sheetHeight}</div>
  ),
}));

function sheet(overrides: Partial<SheetLayout> = {}): SheetLayout {
  return {
    sheetIndex: 0, materialId: 'm1', width: 1000, height: 800,
    placedPieces: [], freeRects: [], usableArea: 800000, wastedArea: 80000, wastePercent: 10,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  layout = null;
  pieces = [];
});

describe('LayoutViewer', () => {
  it('prompts to add pieces when there are none yet', () => {
    render(<LayoutViewer />);
    expect(screen.getByText('Add pieces to see the layout')).toBeTruthy();
  });

  it('shows a computing message when pieces exist but no layout is ready', () => {
    pieces = [{ id: 'p1', name: 'A', materialId: 'm1', width: 100, height: 100, quantity: 1, grain: 'none', rotationAllowed: true, priority: false, edgeBanding: { top: false, right: false, bottom: false, left: false }, color: '#000' }];
    render(<LayoutViewer />);
    expect(screen.getByText('Computing layout…')).toBeTruthy();
  });

  it('renders the first sheet by default with its dimensions', () => {
    layout = { sheets: [sheet(), sheet({ sheetIndex: 1 })], unplacedPieces: [], totalWastePercent: 10, materialUsage: [], totalCost: 0, computedAt: 0 };
    render(<LayoutViewer />);
    expect(screen.getByText('Sheet 1 / 2')).toBeTruthy();
    expect(screen.getByTestId('sheet-canvas').textContent).toBe('1000x800');
  });

  it('navigates to the next and previous sheet', () => {
    layout = { sheets: [sheet(), sheet({ sheetIndex: 1, width: 500, height: 500 })], unplacedPieces: [], totalWastePercent: 10, materialUsage: [], totalCost: 0, computedAt: 0 };
    render(<LayoutViewer />);
    const [prevBtn, nextBtn] = screen.getAllByRole('button');

    fireEvent.click(nextBtn);
    expect(screen.getByText('Sheet 2 / 2')).toBeTruthy();
    expect((nextBtn as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(prevBtn);
    expect(screen.getByText('Sheet 1 / 2')).toBeTruthy();
    expect((prevBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the offcut badge only for a sheet sourced from an offcut', () => {
    layout = { sheets: [sheet({ sourceOffcutId: 'o1' })], unplacedPieces: [], totalWastePercent: 10, materialUsage: [], totalCost: 0, computedAt: 0 };
    render(<LayoutViewer />);
    expect(screen.getByText('offcut')).toBeTruthy();
  });

  it('shows the material name only when there is more than one material', () => {
    layout = { sheets: [sheet({ materialId: 'm1' })], unplacedPieces: [], totalWastePercent: 10, materialUsage: [], totalCost: 0, computedAt: 0 };
    render(<LayoutViewer />);
    expect(screen.getByText(/Chipboard/)).toBeTruthy();
  });

  it('shows an unplaced-pieces warning when some pieces could not fit', () => {
    layout = { sheets: [sheet()], unplacedPieces: [{ definitionId: 'p1', instanceIndex: 0 }], totalWastePercent: 10, materialUsage: [], totalCost: 0, computedAt: 0 };
    render(<LayoutViewer />);
    expect(screen.getByText(/1 piece could not be placed/)).toBeTruthy();
  });

  it('pluralizes the unplaced-pieces warning for more than one piece', () => {
    layout = {
      sheets: [sheet()],
      unplacedPieces: [{ definitionId: 'p1', instanceIndex: 0 }, { definitionId: 'p2', instanceIndex: 0 }],
      totalWastePercent: 10, materialUsage: [], totalCost: 0, computedAt: 0,
    };
    render(<LayoutViewer />);
    expect(screen.getByText(/2 pieces could not be placed/)).toBeTruthy();
  });
});
