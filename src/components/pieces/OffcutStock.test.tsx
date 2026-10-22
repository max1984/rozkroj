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
const addOffcuts = vi.fn();

vi.mock('../../store', () => ({
  useStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ offcutStock, layout, materials, removeOffcut, addOffcuts }),
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

  it('saves every leftover free rect across all sheets in a single addOffcuts call when "Save offcuts" is clicked', () => {
    // A single batched call (not one addOffcut per rect) — recomputeLayout()
    // consumes offcutStock itself (optimizer.ts can pack pieces onto an
    // offcut-sized sheet), so one call per rect used to trigger one full,
    // mostly-discarded optimizer run per rect instead of a single recompute
    // reflecting the whole batch.
    layout = {
      sheets: [
        sheet({ freeRects: [{ x: 0, y: 0, width: 300, height: 200 }] }),
        sheet({ sheetIndex: 1, materialId: 'm1', freeRects: [{ x: 0, y: 0, width: 150, height: 150 }] }),
      ],
      unplacedPieces: [], totalWastePercent: 0, materialUsage: [], totalCost: 0, computedAt: 0,
    };
    render(<OffcutStock />);
    fireEvent.click(screen.getByText('Save offcuts'));
    expect(addOffcuts).toHaveBeenCalledTimes(1);
    expect(addOffcuts).toHaveBeenCalledWith([
      { materialId: 'm1', width: 300, height: 200 },
      { materialId: 'm1', width: 150, height: 150 },
    ]);
  });

  it('does not re-save a free rect that already matches a saved offcut', () => {
    offcutStock = [{ id: 'o1', materialId: 'm1', width: 300, height: 200, label: '300×200' }];
    layout = {
      sheets: [sheet({ freeRects: [{ x: 0, y: 0, width: 300, height: 200 }, { x: 0, y: 0, width: 150, height: 150 }] })],
      unplacedPieces: [], totalWastePercent: 0, materialUsage: [], totalCost: 0, computedAt: 0,
    };
    render(<OffcutStock />);
    fireEvent.click(screen.getByText('Save offcuts'));
    expect(addOffcuts).toHaveBeenCalledTimes(1);
    expect(addOffcuts).toHaveBeenCalledWith([{ materialId: 'm1', width: 150, height: 150 }]);
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

  it('still offers a same-size free rect as new when only one of two identical-size rects was saved', () => {
    // Two different sheets can each leave behind an offcut of the same size —
    // matching on dimensions alone (ignoring how many are already saved) would
    // wrongly treat the second, genuinely-unsaved offcut as a duplicate of the
    // first and silently drop it instead of offering it.
    offcutStock = [{ id: 'o1', materialId: 'm1', width: 300, height: 200, label: '300×200' }];
    layout = {
      sheets: [
        sheet({ freeRects: [{ x: 0, y: 0, width: 300, height: 200 }] }),
        sheet({ sheetIndex: 1, materialId: 'm1', freeRects: [{ x: 0, y: 0, width: 300, height: 200 }] }),
      ],
      unplacedPieces: [], totalWastePercent: 0, materialUsage: [], totalCost: 0, computedAt: 0,
    };
    render(<OffcutStock />);
    fireEvent.click(screen.getByText('Save offcuts'));
    expect(addOffcuts).toHaveBeenCalledTimes(1);
    expect(addOffcuts).toHaveBeenCalledWith([{ materialId: 'm1', width: 300, height: 200 }]);
  });

  it('exposes an accessible name for the icon-only remove button', () => {
    offcutStock = [{ id: 'o1', materialId: 'm1', width: 300, height: 200, label: '300×200' }];
    render(<OffcutStock />);
    expect(screen.getByLabelText('Remove offcut')).toBeTruthy();
  });
});
