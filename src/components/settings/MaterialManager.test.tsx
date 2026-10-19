// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MaterialManager } from './MaterialManager';
import { STANDARD_SHEET_SIZES } from '../../constants/sheetSizes';
import { formatInputValue } from '../../utils/units';
import type { MaterialStock, PieceDefinition } from '../../types';

const addMaterial = vi.fn();
const updateMaterial = vi.fn();
const removeMaterial = vi.fn();
let materials: MaterialStock[] = [];
let pieces: PieceDefinition[] = [];
let mockUnit: 'mm' | 'inch' = 'mm';

vi.mock('../../store', () => ({
  useStore: (selector: (s: {
    materials: MaterialStock[]; pieces: PieceDefinition[];
    addMaterial: typeof addMaterial; updateMaterial: typeof updateMaterial; removeMaterial: typeof removeMaterial;
  }) => unknown) => selector({ materials, pieces, addMaterial, updateMaterial, removeMaterial }),
}));

vi.mock('../../hooks/useUnitDisplay', () => ({
  // unit is read fresh on every call (not captured once) so tests can flip
  // mockUnit and re-render to simulate the user toggling units elsewhere
  // (UnitToggle, mounted alongside this component in Sidebar.tsx) while
  // this one stays mounted.
  useUnitDisplay: () => ({
    unit: mockUnit,
    format: (mm: number) => `${mm}mm`,
    inputValue: (mm: number) => formatInputValue(mm, mockUnit),
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
  mockUnit = 'mm';
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

  it(
    're-syncs the custom-size input to the new unit on a unit switch, instead of leaving the old ' +
      "unit's stale number in the DOM where a later blur would reinterpret it in the NEW unit " +
      '(e.g. "2800" mm silently becoming 2800 INCH -> 71120mm on blur, with no edit by the user at all)',
    () => {
      materials = [material({ size: { label: 'Custom', width: 2800, height: 500, custom: true } })];
      const { rerender } = render(<MaterialManager />);
      const widthInputBefore = screen.getByPlaceholderText('Width (mm)') as HTMLInputElement;
      expect(widthInputBefore.value).toBe('2800');

      mockUnit = 'inch';
      rerender(<MaterialManager />);

      // key={unit} forces a remount here — the input must now be a FRESH
      // element showing the correctly inch-converted number, not the old
      // element still holding "2800".
      const widthInputAfter = screen.getByPlaceholderText('Width (inch)') as HTMLInputElement;
      expect(widthInputAfter.value).toBe(formatInputValue(2800, 'inch'));

      // And blurring it now, unedited, must do NOTHING — the displayed
      // text already matches the current value exactly, so there's
      // nothing to commit. (It must NOT reinterpret "2800" as inches
      // either way, but asserting "not called at all" is the stronger,
      // more precise claim now that an unedited blur is a deliberate no-op.)
      fireEvent.blur(widthInputAfter, { target: { value: widthInputAfter.value } });
      expect(updateMaterial).not.toHaveBeenCalled();
    }
  );

  it('does nothing on an unedited blur, even without a unit switch — avoids a false dirty-flag/undo-entry for a value nothing changed', () => {
    materials = [material({ size: { label: 'Custom', width: 2800, height: 500, custom: true } })];
    render(<MaterialManager />);
    const widthInput = screen.getByPlaceholderText('Width (mm)') as HTMLInputElement;

    fireEvent.blur(widthInput, { target: { value: widthInput.value } });

    expect(updateMaterial).not.toHaveBeenCalled();
  });

  it(
    'also does nothing when the typed text is a differently-formatted but numerically identical value — ' +
      'the guard compares the PARSED NUMBERS of the typed text and the display value, not the raw ' +
      'strings, so "2800.0" for an already-2800 width is recognized as unchanged too',
    () => {
      materials = [material({ size: { label: 'Custom', width: 2800, height: 500, custom: true } })];
      render(<MaterialManager />);
      const widthInput = screen.getByPlaceholderText('Width (mm)') as HTMLInputElement;

      fireEvent.blur(widthInput, { target: { value: '2800.0' } });

      expect(updateMaterial).not.toHaveBeenCalled();
    }
  );

  it(
    'does not silently drift a sub-0.1mm-precision custom width on an unedited blur after a unit switch ' +
      '— the guard must recognize "unedited" WITHOUT ever running the lossy toMm conversion first, since ' +
      'that conversion alone (applied to the already-truncated inch display) can differ from the ' +
      'original even though the user touched nothing',
    () => {
      materials = [material({ size: { label: 'Custom', width: 123.456, height: 500, custom: true } })];
      const { rerender } = render(<MaterialManager />);

      mockUnit = 'inch';
      rerender(<MaterialManager />);
      const widthInput = screen.getByPlaceholderText('Width (inch)') as HTMLInputElement;

      // Unedited blur — the field shows whatever defaultValue/key gave it,
      // untouched by the user.
      fireEvent.blur(widthInput, { target: { value: widthInput.value } });

      expect(updateMaterial).not.toHaveBeenCalled();
    }
  );

  it('defaults an empty price-per-sheet entry to 0 on blur', () => {
    // Starts non-zero so clearing the field is an actual DOM value change.
    materials = [material({ pricePerSheet: 10 })];
    render(<MaterialManager />);
    const priceInput = screen.getByDisplayValue('10');
    fireEvent.blur(priceInput, { target: { value: '' } });
    expect(updateMaterial).toHaveBeenCalledWith('m1', { pricePerSheet: 0 });
  });

  it('parses a valid price-per-sheet entry on blur', () => {
    materials = [material()];
    render(<MaterialManager />);
    const priceInput = screen.getByPlaceholderText('0');
    fireEvent.blur(priceInput, { target: { value: '42.5' } });
    expect(updateMaterial).toHaveBeenCalledWith('m1', { pricePerSheet: 42.5 });
  });

  it(
    'lets a decimal price be typed character-by-character instead of being stripped mid-typing — ' +
      'the field used to be fully controlled, re-committing parseFloat(text) on every change and ' +
      'reformatting the input back to the plain integer the moment the trailing "." was typed, making ' +
      'it impossible to ever reach a value like 12.50',
    () => {
      materials = [material()];
      render(<MaterialManager />);
      const priceInput = screen.getByPlaceholderText('0');
      fireEvent.change(priceInput, { target: { value: '12' } });
      fireEvent.change(priceInput, { target: { value: '12.' } });
      fireEvent.change(priceInput, { target: { value: '12.5' } });
      expect(updateMaterial).not.toHaveBeenCalled();  // uncontrolled — no commit until blur
      fireEvent.blur(priceInput, { target: { value: '12.5' } });
      expect(updateMaterial).toHaveBeenCalledWith('m1', { pricePerSheet: 12.5 });
    }
  );

  it('ignores an unedited price blur (same value re-blurred)', () => {
    materials = [material({ pricePerSheet: 10 })];
    render(<MaterialManager />);
    const priceInput = screen.getByDisplayValue('10') as HTMLInputElement;
    fireEvent.blur(priceInput, { target: { value: priceInput.value } });
    expect(updateMaterial).not.toHaveBeenCalled();
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
