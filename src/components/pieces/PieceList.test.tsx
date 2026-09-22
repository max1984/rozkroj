// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PieceList } from './PieceList';
import type { MaterialStock, PieceDefinition } from '../../types';

const setPieces = vi.fn();
const addPiece = vi.fn();
const updatePiece = vi.fn();
let pieces: PieceDefinition[] = [];
const materials: MaterialStock[] = [
  { id: 'm1', name: 'Chipboard', color: '#4e79a7', size: { label: 'Sheet', width: 2440, height: 1220 }, pricePerSheet: 0 },
];

function state() {
  return { pieces, setPieces, unit: 'mm' as const, materials, addPiece, updatePiece, selectedPieceId: null, hoveredPieceId: null, setSelectedPieceId: vi.fn(), setHoveredPieceId: vi.fn(), removePiece: vi.fn() };
}

vi.mock('../../store', () => {
  const useStore = (selector: (s: ReturnType<typeof state>) => unknown) => selector(state());
  useStore.getState = () => state();
  return { useStore };
});

vi.mock('../../hooks/useUnitDisplay', () => ({
  useUnitDisplay: () => ({ unit: 'mm' as const, format: (mm: number) => `${mm}mm`, inputValue: (mm: number) => String(mm), toMm: (v: number) => v }),
}));

const importCsv = vi.fn();
vi.mock('../../utils/csv', () => ({ importCsv: (...args: unknown[]) => importCsv(...args) }));

function piece(overrides: Partial<PieceDefinition> = {}): PieceDefinition {
  return {
    id: 'p1', name: 'Shelf', materialId: 'm1', width: 600, height: 400, quantity: 1,
    grain: 'none', rotationAllowed: true, priority: false,
    edgeBanding: { top: false, right: false, bottom: false, left: false }, color: '#000',
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  pieces = [];
});

describe('PieceList', () => {
  it('shows an empty state with a shortcut to add the first piece', () => {
    render(<PieceList />);
    expect(screen.getByText('No pieces yet.')).toBeTruthy();
    fireEvent.click(screen.getByText('Add your first piece'));
    expect(screen.getByText('Add Piece')).toBeTruthy();
  });

  it('shows the total quantity across all pieces in the header', () => {
    pieces = [piece({ id: 'p1', quantity: 2 }), piece({ id: 'p2', quantity: 3 })];
    render(<PieceList />);
    expect(screen.getByText('(5 total)')).toBeTruthy();
  });

  it('opens the add-piece form when the plus button is clicked', () => {
    render(<PieceList />);
    fireEvent.click(screen.getByTitle('Add piece'));
    expect(screen.getByText('Add Piece')).toBeTruthy();
  });

  it('renders a row for each piece', () => {
    pieces = [piece({ id: 'p1', name: 'Left side' }), piece({ id: 'p2', name: 'Right side' })];
    render(<PieceList />);
    expect(screen.getByText('Left side')).toBeTruthy();
    expect(screen.getByText('Right side')).toBeTruthy();
  });

  it('imports a CSV file and appends the parsed pieces to the current list', () => {
    pieces = [piece({ id: 'existing' })];
    const imported = [piece({ id: 'new-1' })];
    importCsv.mockImplementation((_file, _unit, _count, _materials, onDone) => onDone(imported));

    const { container } = render(<PieceList />);
    const fileInput = container.querySelector('input[type="file"]')!;
    const file = new File(['csv'], 'cutlist.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(setPieces).toHaveBeenCalledWith([...pieces, ...imported]);
  });

  it('alerts on a CSV parse error instead of updating pieces', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    importCsv.mockImplementation((_file, _unit, _count, _materials, _onDone, onError) => onError('bad csv'));

    const { container } = render(<PieceList />);
    const fileInput = container.querySelector('input[type="file"]')!;
    const file = new File(['csv'], 'cutlist.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(alertSpy).toHaveBeenCalledWith('bad csv');
    expect(setPieces).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
