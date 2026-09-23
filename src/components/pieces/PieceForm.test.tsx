// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PieceForm } from './PieceForm';
import type { MaterialStock } from '../../types';

const material: MaterialStock = {
  id: 'm1', name: 'Chipboard', color: '#4e79a7',
  size: { label: 'Sheet', width: 2440, height: 1220 }, pricePerSheet: 0,
};

const addPiece = vi.fn();
const updatePiece = vi.fn();

vi.mock('../../store', () => ({
  useStore: (selector: (s: { addPiece: typeof addPiece; updatePiece: typeof updatePiece; materials: MaterialStock[] }) => unknown) =>
    selector({ addPiece, updatePiece, materials: [material] }),
}));

vi.mock('../../hooks/useUnitDisplay', () => ({
  useUnitDisplay: () => ({
    unit: 'mm' as const,
    toMm: (v: number) => v,
    inputValue: (mm: number) => String(mm),
  }),
}));

afterEach(() => {
  cleanup();
  addPiece.mockClear();
  updatePiece.mockClear();
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

  it('associates each field with its visible label for screen readers', () => {
    render(<PieceForm onClose={vi.fn()} />);
    expect(screen.getByLabelText('Name (optional)')).toBeTruthy();
    expect(screen.getByLabelText('Width (mm)')).toBeTruthy();
    expect(screen.getByLabelText('Height (mm)')).toBeTruthy();
    expect(screen.getByLabelText('Qty')).toBeTruthy();
    expect(screen.getByLabelText('Grain Direction')).toBeTruthy();
  });
});
