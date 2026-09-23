// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { OffcutStock } from './OffcutStock';
import type { LayoutResult, MaterialStock, OffcutItem, SheetLayout } from '../../types';

let offcutStock: OffcutItem[] = [];
let layout: LayoutResult | null = null;
const materials: MaterialStock[] = [
  { id: 'm1', name: 'Chipboard', color: '#4e79a7', size: { label: 'Sheet', width: 2440, height: 1220 }, pricePerSheet: 0 },
];
const removeOffcut = vi.fn();
const addOffcut = vi.fn();

vi.mock('../../store', () => ({
  useStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ offcutStock, layout, materials, removeOffcut, addOffcut }),
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  offcutStock = [];
  layout = null;
});

describe('OffcutStock', () => {
  it('shows the empty-state hint when nothing is saved', () => {
    render(<OffcutStock />);
    expect(screen.getByText(/No saved offcuts/)).toBeTruthy();
  });

  it('lists saved offcuts with their dimensions', () => {
    offcutStock = [{ id: 'o1', materialId: 'm1', width: 300, height: 200, label: '300×200' }];
    render(<OffcutStock />);
    expect(screen.getByText('300mm × 200mm')).toBeTruthy();
  });

  it('removes an offcut when its delete button is clicked', () => {
    offcutStock = [{ id: 'o1', materialId: 'm1', width: 300, height: 200, label: '300×200' }];
    const { container } = render(<OffcutStock />);
    fireEvent.click(container.querySelector('button')!);
    expect(removeOffcut).toHaveBeenCalledWith('o1');
  });

  it('does not show "Save offcuts" when the layout has no leftover free rects', () => {
    layout = { sheets: [sheet({ freeRects: [] })], unplacedPieces: [], totalWastePercent: 0, materialUsage: [], totalCost: 0, computedAt: 0 };
    render(<OffcutStock />);
    expect(screen.queryByText('Save offcuts')).toBeNull();
  });

  it('saves every leftover free rect across all sheets when "Save offcuts" is clicked', () => {
    layout = {
      sheets: [
        sheet({ freeRects: [{ x: 0, y: 0, width: 300, height: 200 }] }),
        sheet({ sheetIndex: 1, materialId: 'm1', freeRects: [{ x: 0, y: 0, width: 150, height: 150 }] }),
      ],
      unplacedPieces: [], totalWastePercent: 0, materialUsage: [], totalCost: 0, computedAt: 0,
    };
    render(<OffcutStock />);
    fireEvent.click(screen.getByText('Save offcuts'));
    expect(addOffcut).toHaveBeenCalledTimes(2);
    expect(addOffcut).toHaveBeenCalledWith('m1', 300, 200);
    expect(addOffcut).toHaveBeenCalledWith('m1', 150, 150);
  });

  it('does not re-save a free rect that already matches a saved offcut', () => {
    offcutStock = [{ id: 'o1', materialId: 'm1', width: 300, height: 200, label: '300×200' }];
    layout = {
      sheets: [sheet({ freeRects: [{ x: 0, y: 0, width: 300, height: 200 }, { x: 0, y: 0, width: 150, height: 150 }] })],
      unplacedPieces: [], totalWastePercent: 0, materialUsage: [], totalCost: 0, computedAt: 0,
    };
    render(<OffcutStock />);
    fireEvent.click(screen.getByText('Save offcuts'));
    expect(addOffcut).toHaveBeenCalledTimes(1);
    expect(addOffcut).toHaveBeenCalledWith('m1', 150, 150);
  });

  it('hides "Save offcuts" once every leftover free rect has already been saved', () => {
    offcutStock = [{ id: 'o1', materialId: 'm1', width: 300, height: 200, label: '300×200' }];
    layout = {
      sheets: [sheet({ freeRects: [{ x: 0, y: 0, width: 300, height: 200 }] })],
      unplacedPieces: [], totalWastePercent: 0, materialUsage: [], totalCost: 0, computedAt: 0,
    };
    render(<OffcutStock />);
    expect(screen.queryByText('Save offcuts')).toBeNull();
  });

  it('exposes an accessible name for the icon-only remove button', () => {
    offcutStock = [{ id: 'o1', materialId: 'm1', width: 300, height: 200, label: '300×200' }];
    render(<OffcutStock />);
    expect(screen.getByLabelText('Remove offcut')).toBeTruthy();
  });
});
