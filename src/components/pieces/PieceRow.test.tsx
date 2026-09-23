// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PieceRow } from './PieceRow';
import type { MaterialStock, PieceDefinition } from '../../types';

const removePiece = vi.fn();
const duplicatePiece = vi.fn();
const setHoveredPieceId = vi.fn();
const setSelectedPieceId = vi.fn();
const addPiece = vi.fn();
const updatePiece = vi.fn();
let selectedPieceId: string | null = null;
let layout: { unplacedPieces: { definitionId: string; instanceIndex: number }[] } | undefined = undefined;
const materials: MaterialStock[] = [
  { id: 'm1', name: 'Chipboard', color: '#4e79a7', size: { label: 'Sheet', width: 2440, height: 1220 }, pricePerSheet: 0 },
  { id: 'm2', name: 'MDF', color: '#f28e2b', size: { label: 'Sheet', width: 2440, height: 1220 }, pricePerSheet: 0 },
];

vi.mock('../../store', () => ({
  useStore: (selector: (s: Record<string, unknown>) => unknown) => selector({
    removePiece, duplicatePiece, setHoveredPieceId, setSelectedPieceId, selectedPieceId, materials, addPiece, updatePiece, layout,
  }),
}));

vi.mock('../../hooks/useUnitDisplay', () => ({
  useUnitDisplay: () => ({
    unit: 'mm' as const,
    format: (mm: number) => `${mm}mm`,
    inputValue: (mm: number) => String(mm),
    toMm: (v: number) => v,
  }),
}));

function piece(overrides: Partial<PieceDefinition> = {}): PieceDefinition {
  return {
    id: 'p1', name: 'Shelf', materialId: 'm1', width: 600, height: 400, quantity: 2,
    grain: 'none', rotationAllowed: true, priority: false,
    edgeBanding: { top: false, right: false, bottom: false, left: false }, color: '#000',
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  selectedPieceId = null;
  layout = undefined;
});

describe('PieceRow', () => {
  it('renders the piece name, dimensions and quantity', () => {
    render(<PieceRow piece={piece()} />);
    expect(screen.getByText('Shelf')).toBeTruthy();
    expect(screen.getByText('600mm × 400mm × 2')).toBeTruthy();
  });

  it('shows the material name only when there is more than one material', () => {
    render(<PieceRow piece={piece()} />);
    expect(screen.getByText(/Chipboard/)).toBeTruthy();
  });

  it('selects the piece when clicked, and deselects it on a second click', () => {
    const { rerender } = render(<PieceRow piece={piece()} />);
    fireEvent.click(screen.getByText('Shelf'));
    expect(setSelectedPieceId).toHaveBeenCalledWith('p1');

    selectedPieceId = 'p1';
    rerender(<PieceRow piece={piece()} />);
    fireEvent.click(screen.getByText('Shelf'));
    expect(setSelectedPieceId).toHaveBeenCalledWith(null);
  });

  it('sets and clears the hovered piece id on mouse enter/leave', () => {
    const { container } = render(<PieceRow piece={piece()} />);
    const row = container.firstElementChild!;
    fireEvent.mouseEnter(row);
    expect(setHoveredPieceId).toHaveBeenCalledWith('p1');
    fireEvent.mouseLeave(row);
    expect(setHoveredPieceId).toHaveBeenCalledWith(null);
  });

  it('removes the piece without triggering row selection', () => {
    const { container } = render(<PieceRow piece={piece()} />);
    const deleteBtn = container.querySelectorAll('button')[2];
    fireEvent.click(deleteBtn);
    expect(removePiece).toHaveBeenCalledWith('p1');
    expect(setSelectedPieceId).not.toHaveBeenCalled();
  });

  it('duplicates the piece without triggering row selection', () => {
    const { container } = render(<PieceRow piece={piece()} />);
    const duplicateBtn = container.querySelectorAll('button')[1];
    fireEvent.click(duplicateBtn);
    expect(duplicatePiece).toHaveBeenCalledWith('p1');
    expect(setSelectedPieceId).not.toHaveBeenCalled();
  });

  it('switches to edit mode (rendering PieceForm) without triggering row selection', () => {
    const { container } = render(<PieceRow piece={piece()} />);
    const editBtn = container.querySelectorAll('button')[0];
    fireEvent.click(editBtn);
    expect(setSelectedPieceId).not.toHaveBeenCalled();
    // PieceForm is now rendered in place of the row, with the piece's values pre-filled.
    expect(screen.getByDisplayValue('600')).toBeTruthy();
  });

  it('shows a grain indicator only when the piece has a grain direction', () => {
    const { rerender } = render(<PieceRow piece={piece({ grain: 'none' })} />);
    expect(screen.queryByText(/grain/)).toBeNull();
    rerender(<PieceRow piece={piece({ grain: 'horizontal' })} />);
    expect(screen.getByText(/grain/)).toBeTruthy();
  });

  it('shows an unplaced-count badge only when the layout reports unplaced instances of this piece', () => {
    layout = { unplacedPieces: [{ definitionId: 'other-piece', instanceIndex: 0 }] };
    const { rerender } = render(<PieceRow piece={piece()} />);
    expect(screen.queryByText(/unplaced/)).toBeNull();

    layout = { unplacedPieces: [{ definitionId: 'p1', instanceIndex: 0 }, { definitionId: 'p1', instanceIndex: 1 }] };
    rerender(<PieceRow piece={piece()} />);
    expect(screen.getByText(/2 unplaced/)).toBeTruthy();
  });

  it('exposes accessible names for the icon-only edit, duplicate and delete buttons', () => {
    render(<PieceRow piece={piece()} />);
    expect(screen.getByLabelText('Edit piece')).toBeTruthy();
    expect(screen.getByLabelText('Duplicate piece')).toBeTruthy();
    expect(screen.getByLabelText('Delete piece')).toBeTruthy();
  });
});
