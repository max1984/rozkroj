// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PieceForm } from './PieceForm';
import { toMm, formatInputValue } from '../../utils/units';
import type { MaterialStock } from '../../types';

const material: MaterialStock = {
  id: 'm1', name: 'Chipboard', color: '#4e79a7',
  size: { label: 'Sheet', width: 2440, height: 1220 }, pricePerSheet: 0,
};

const material2: MaterialStock = {
  id: 'm2', name: 'MDF', color: '#f28e2b',
  size: { label: 'Sheet', width: 2800, height: 2070 }, pricePerSheet: 0,
};

const addPiece = vi.fn();
const updatePiece = vi.fn();
let mockUnit: 'mm' | 'inch' = 'mm';
// Mutable (not a literal captured once by the mock factory) so a test can
// simulate MaterialManager — rendered alongside this form, not modally —
// deleting the currently selected material out from under an open form,
// the same way `mockUnit` simulates UnitToggle being used elsewhere.
let mockMaterials: MaterialStock[] = [material];

vi.mock('../../store', () => ({
  useStore: (selector: (s: { addPiece: typeof addPiece; updatePiece: typeof updatePiece; materials: MaterialStock[] }) => unknown) =>
    selector({ addPiece, updatePiece, materials: mockMaterials }),
}));

vi.mock('../../hooks/useUnitDisplay', () => ({
  // unit/toMm/inputValue read mockUnit fresh on every call (not captured
  // once) so tests can flip it and re-render to simulate the user toggling
  // units elsewhere (UnitToggle, clickable alongside this inline form in
  // Sidebar.tsx) while this form stays open. Real conversion math (not an
  // identity stub), so a test asserting a specific converted value isn't
  // tautological against the component's own logic.
  useUnitDisplay: () => ({
    unit: mockUnit,
    toMm: (v: number) => toMm(v, mockUnit),
    inputValue: (mm: number) => formatInputValue(mm, mockUnit),
  }),
}));

afterEach(() => {
  cleanup();
  addPiece.mockClear();
  updatePiece.mockClear();
  mockUnit = 'mm';
  mockMaterials = [material];
});

function fillAndSubmit(container: HTMLElement, values: { width?: string; height?: string; qty?: string }) {
  const [widthInput, heightInput, qtyInput] = container.querySelectorAll('input[type="number"]');
  if (values.width !== undefined) fireEvent.change(widthInput, { target: { value: values.width } });
  if (values.height !== undefined) fireEvent.change(heightInput, { target: { value: values.height } });
  if (values.qty !== undefined) fireEvent.change(qtyInput, { target: { value: values.qty } });
  fireEvent.submit(container.querySelector('form')!);
}

describe('PieceForm', () => {
  it('adds a piece when width, height and quantity are all valid', () => {
    const onClose = vi.fn();
    const { container } = render(<PieceForm onClose={onClose} />);

    fillAndSubmit(container, { width: '600', height: '400', qty: '3' });

    expect(addPiece).toHaveBeenCalledTimes(1);
    expect(addPiece.mock.calls[0][0]).toMatchObject({ width: 600, height: 400, quantity: 3, materialId: 'm1' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not submit when quantity is empty (regression: used to silently save quantity NaN)', () => {
    const onClose = vi.fn();
    const { container } = render(<PieceForm onClose={onClose} />);

    fillAndSubmit(container, { width: '600', height: '400', qty: '' });

    expect(addPiece).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it(
    're-syncs width/height to the new unit on a unit switch while editing, instead of leaving the old ' +
      "unit's number in the fields where an untouched submit would reinterpret it in the NEW unit " +
      '(e.g. "1000" mm silently becoming 1000 INCH -> 25400mm on Update, with no edit by the user at all)',
    () => {
      const piece = {
        id: 'p1', name: 'Shelf', materialId: 'm1', width: 1000, height: 500, quantity: 1,
        grain: 'none' as const, rotationAllowed: true, priority: false,
        edgeBanding: { top: false, right: false, bottom: false, left: false },
        color: '#000000',
      };
      const onClose = vi.fn();
      const { container, rerender } = render(<PieceForm editing={piece} onClose={onClose} />);
      const [widthInputBefore] = container.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>;
      expect(widthInputBefore.value).toBe('1000');

      mockUnit = 'inch';
      rerender(<PieceForm editing={piece} onClose={onClose} />);

      const [widthInputAfter] = container.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>;
      expect(widthInputAfter.value).toBe(formatInputValue(1000, 'inch'));

      // Submitting now, unedited, must commit back the SAME original
      // 1000mm — not a corrupted ~25400mm from reinterpreting "1000" as inches.
      fireEvent.submit(container.querySelector('form')!);
      expect(updatePiece).toHaveBeenCalledTimes(1);
      expect(updatePiece.mock.calls[0][1]).toMatchObject({ width: 1000 });
    }
  );

  it(
    'does not silently drift a sub-0.1mm-precision dimension on an unedited unit toggle (round-trip ' +
      'mm->inch->mm), unlike a naive "always reinterpret the shown text" resync would',
    () => {
      // toMm only rounds to 0.1mm when converting FROM inch, never when the
      // unit is already mm — so a value like 123.456mm (entered directly in
      // mm, no inch rounding ever applied to it) can hold more precision
      // than any inch-unit round-trip could losslessly carry.
      const piece = {
        id: 'p1', name: 'Shelf', materialId: 'm1', width: 123.456, height: 500, quantity: 1,
        grain: 'none' as const, rotationAllowed: true, priority: false,
        edgeBanding: { top: false, right: false, bottom: false, left: false },
        color: '#000000',
      };
      const onClose = vi.fn();
      const { rerender } = render(<PieceForm editing={piece} onClose={onClose} />);

      // Toggle to inch and back to mm, touching nothing in between — a
      // "peek at the inch value" gesture that must not change anything.
      mockUnit = 'inch';
      rerender(<PieceForm editing={piece} onClose={onClose} />);
      mockUnit = 'mm';
      rerender(<PieceForm editing={piece} onClose={onClose} />);

      fireEvent.submit(document.querySelector('form')!);
      expect(updatePiece.mock.calls[0][1]).toMatchObject({ width: 123.456 });
    }
  );

  it(
    'still preserves full precision after a unit toggle even if the field was edited earlier and then ' +
      'changed back to the exact original text — "untouched" is judged by the current text, not by a ' +
      'sticky flag that a net-zero edit would leave permanently set',
    () => {
      const piece = {
        id: 'p1', name: 'Shelf', materialId: 'm1', width: 123.456, height: 500, quantity: 1,
        grain: 'none' as const, rotationAllowed: true, priority: false,
        edgeBanding: { top: false, right: false, bottom: false, left: false },
        color: '#000000',
      };
      const onClose = vi.fn();
      const { container, rerender } = render(<PieceForm editing={piece} onClose={onClose} />);
      const [widthInput] = container.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>;

      // Edit away, then edit right back to the original text — net zero,
      // but a prior version of this fix tracked "was this ever edited" as
      // a one-way flag, which this would have left permanently tripped.
      fireEvent.change(widthInput, { target: { value: '999' } });
      fireEvent.change(widthInput, { target: { value: '123.456' } });

      mockUnit = 'inch';
      rerender(<PieceForm editing={piece} onClose={onClose} />);
      mockUnit = 'mm';
      rerender(<PieceForm editing={piece} onClose={onClose} />);

      fireEvent.submit(document.querySelector('form')!);
      expect(updatePiece.mock.calls[0][1]).toMatchObject({ width: 123.456 });
    }
  );

  it('does not submit when quantity is zero', () => {
    const onClose = vi.fn();
    const { container } = render(<PieceForm onClose={onClose} />);

    fillAndSubmit(container, { width: '600', height: '400', qty: '0' });

    expect(addPiece).not.toHaveBeenCalled();
  });

  it('does not submit when width is zero', () => {
    const onClose = vi.fn();
    const { container } = render(<PieceForm onClose={onClose} />);

    fillAndSubmit(container, { width: '0', height: '400', qty: '1' });

    expect(addPiece).not.toHaveBeenCalled();
  });

  it('calls updatePiece instead of addPiece when editing an existing piece', () => {
    const onClose = vi.fn();
    const editing = {
      id: 'p1', name: 'Shelf', materialId: 'm1', width: 500, height: 500, quantity: 1,
      grain: 'none' as const, rotationAllowed: true, priority: false,
      edgeBanding: { top: false, right: false, bottom: false, left: false }, color: '#000',
    };
    const { container } = render(<PieceForm editing={editing} onClose={onClose} />);

    fillAndSubmit(container, { width: '700' });

    expect(updatePiece).toHaveBeenCalledTimes(1);
    expect(updatePiece.mock.calls[0][0]).toBe('p1');
    expect(updatePiece.mock.calls[0][1]).toMatchObject({ width: 700 });
    expect(addPiece).not.toHaveBeenCalled();
  });

  it(
    'resyncs materialId to the fallback material if the selected one is deleted (via MaterialManager, ' +
      'rendered alongside this inline form, not a modal) while this form is still open and uncommitted — ' +
      "without this, submitting afterward would save a materialId matching no entry in `materials`, and " +
      "optimizer.ts's exact-id filter per material would silently drop the piece from every sheet's layout",
    () => {
      mockMaterials = [material, material2];
      const onClose = vi.fn();
      const { container, rerender } = render(<PieceForm onClose={onClose} />);

      // Material removed elsewhere (MaterialManager) — 'm1' no longer exists.
      mockMaterials = [material2];
      rerender(<PieceForm onClose={onClose} />);

      fillAndSubmit(container, { width: '600', height: '400', qty: '1' });

      expect(addPiece).toHaveBeenCalledTimes(1);
      expect(addPiece.mock.calls[0][0]).toMatchObject({ materialId: 'm2' });
    }
  );

  it('associates each field with its visible label for screen readers', () => {
    render(<PieceForm onClose={vi.fn()} />);
    expect(screen.getByLabelText('Name (optional)')).toBeTruthy();
    expect(screen.getByLabelText('Width (mm)')).toBeTruthy();
    expect(screen.getByLabelText('Height (mm)')).toBeTruthy();
    expect(screen.getByLabelText('Qty')).toBeTruthy();
    expect(screen.getByLabelText('Grain Direction')).toBeTruthy();
  });

  it(
    'regression: disables "Allow rotation" once a grain direction is set — optimizer.ts\'s ' +
      "expandPieces() always forces rotationAllowed to false whenever grain !== 'none' " +
      '(a grained piece can\'t be rotated 90° without the grain running the wrong way), so ' +
      'leaving the checkbox interactive let a user check it and see it rendered as checked ' +
      'with no indication the optimizer would silently disregard it',
    () => {
      render(<PieceForm onClose={vi.fn()} />);
      const rotationCheckbox = screen.getByLabelText('Allow rotation') as HTMLInputElement;
      expect(rotationCheckbox.disabled).toBe(false);

      fireEvent.change(screen.getByLabelText('Grain Direction'), { target: { value: 'horizontal' } });
      expect(rotationCheckbox.disabled).toBe(true);

      fireEvent.change(screen.getByLabelText('Grain Direction'), { target: { value: 'none' } });
      expect(rotationCheckbox.disabled).toBe(false);
    }
  );
});
