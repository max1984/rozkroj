// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MaterialManager } from './MaterialManager';
import { STANDARD_SHEET_SIZES } from '../../constants/sheetSizes';
import type { MaterialStock, PieceDefinition } from '../../types';

const addMaterial = vi.fn();
const updateMaterial = vi.fn();
const removeMaterial = vi.fn();
let materials: MaterialStock[] = [];
let pieces: PieceDefinition[] = [];

vi.mock('../../store', () => ({
  useStore: (selector: (s: {
    materials: MaterialStock[]; pieces: PieceDefinition[];
    addMaterial: typeof addMaterial; updateMaterial: typeof updateMaterial; removeMaterial: typeof removeMaterial;
  }) => unknown) => selector({ materials, pieces, addMaterial, updateMaterial, removeMaterial }),
}));

vi.mock('../../hooks/useUnitDisplay', () => ({
  useUnitDisplay: () => ({
    unit: 'mm' as const,
    format: (mm: number) => `${mm}mm`,
    inputValue: (mm: number) => String(mm),
  }),
}));

function material(overrides: Partial<MaterialStock> = {}): MaterialStock {
  return {
    id: 'm1', name: 'Chipboard', color: '#4e79a7',
    size: { label: 'Custom', width: 1000, height: 500, custom: true },
    pricePerSheet: 0,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  materials = [];
  pieces = [];
});

describe('MaterialManager', () => {
  it('expands the first material by default and shows its custom size inputs', () => {
    materials = [material()];
    render(<MaterialManager />);
    expect(screen.getByDisplayValue('Chipboard')).toBeTruthy();
    expect(screen.getByPlaceholderText('Width (mm)')).toBeTruthy();
  });

  it('reflects the expanded state via aria-expanded, toggling on click', () => {
    materials = [material()];
    const { container } = render(<MaterialManager />);
    const toggleBtn = container.querySelector('button[aria-expanded]')!;
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(toggleBtn);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
  });

  it('updates a custom width on blur with a valid value', () => {
    materials = [material()];
    render(<MaterialManager />);
    fireEvent.blur(screen.getByPlaceholderText('Width (mm)'), { target: { value: '1200' } });
    expect(updateMaterial).toHaveBeenCalledWith('m1', { size: { label: 'Custom', width: 1200, height: 500, custom: true } });
  });

  it('ignores a zero custom width on blur', () => {
    materials = [material()];
    render(<MaterialManager />);
    fireEvent.blur(screen.getByPlaceholderText('Width (mm)'), { target: { value: '0' } });
    expect(updateMaterial).not.toHaveBeenCalled();
  });

  it('ignores an empty custom height on blur', () => {
    materials = [material()];
    render(<MaterialManager />);
    fireEvent.blur(screen.getByPlaceholderText('Height (mm)'), { target: { value: '' } });
    expect(updateMaterial).not.toHaveBeenCalled();
  });

  it('defaults an empty price-per-sheet entry to 0', () => {
    // Starts non-zero so clearing the field is an actual DOM value change.
    materials = [material({ pricePerSheet: 10 })];
    render(<MaterialManager />);
    const priceInput = screen.getByDisplayValue('10');
    fireEvent.change(priceInput, { target: { value: '' } });
    expect(updateMaterial).toHaveBeenCalledWith('m1', { pricePerSheet: 0 });
  });

  it('parses a valid price-per-sheet entry', () => {
    materials = [material()];
    render(<MaterialManager />);
    const priceInput = screen.getByPlaceholderText('0');
    fireEvent.change(priceInput, { target: { value: '42.5' } });
    expect(updateMaterial).toHaveBeenCalledWith('m1', { pricePerSheet: 42.5 });
  });

  it('switches to a standard sheet size, replacing the size object', () => {
    materials = [material()];
    render(<MaterialManager />);
    const standard = STANDARD_SHEET_SIZES[0];
    fireEvent.change(screen.getByDisplayValue('Custom'), { target: { value: `${standard.width}x${standard.height}` } });
    expect(updateMaterial).toHaveBeenCalledWith('m1', { size: standard });
  });

  it('hides the remove button when there is only one material', () => {
    materials = [material()];
    render(<MaterialManager />);
    expect(screen.queryByTitle('Remove material')).toBeNull();
  });

  it('shows and wires the remove button when there is more than one material', () => {
    materials = [material({ id: 'm1' }), material({ id: 'm2', name: 'MDF' })];
    render(<MaterialManager />);
    const removeButtons = screen.getAllByTitle('Remove material');
    fireEvent.click(removeButtons[0]);
    expect(removeMaterial).toHaveBeenCalledWith('m1');
  });

  it('adds a new material with a numbered default name', () => {
    materials = [material()];
    render(<MaterialManager />);
    fireEvent.click(screen.getByTitle('Add material'));
    expect(addMaterial).toHaveBeenCalledTimes(1);
    expect(addMaterial.mock.calls[0][0].name).toContain('(2)');
  });

  it('shows the piece count using this material', () => {
    materials = [material()];
    pieces = [
      { id: 'p1', name: 'A', materialId: 'm1', width: 100, height: 100, quantity: 2, grain: 'none', rotationAllowed: true, priority: false, edgeBanding: { top: false, right: false, bottom: false, left: false }, color: '#000' },
      { id: 'p2', name: 'B', materialId: 'm1', width: 100, height: 100, quantity: 3, grain: 'none', rotationAllowed: true, priority: false, edgeBanding: { top: false, right: false, bottom: false, left: false }, color: '#000' },
    ];
    render(<MaterialManager />);
    expect(screen.getByText('5 pieces using this material')).toBeTruthy();
  });

  it('associates the name, sheet size and price fields with their labels', () => {
    materials = [material()];
    render(<MaterialManager />);
    expect(screen.getByLabelText('Name')).toBeTruthy();
    expect(screen.getByLabelText('Sheet size')).toBeTruthy();
    expect(screen.getByLabelText('Price per sheet')).toBeTruthy();
  });
});
