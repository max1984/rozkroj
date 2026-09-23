// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { KerfSettings } from './KerfSettings';
import type { CuttingSettings } from '../../types';

let settings: CuttingSettings = { sawKerf: 3, freshEdge: true, freshEdgeTrim: 10 };
const setSettings = vi.fn((patch: Partial<CuttingSettings>) => {
  settings = { ...settings, ...patch };
});

vi.mock('../../store', () => ({
  useStore: (selector: (s: { settings: CuttingSettings; setSettings: typeof setSettings }) => unknown) =>
    selector({ settings, setSettings }),
}));

vi.mock('../../hooks/useUnitDisplay', () => ({
  useUnitDisplay: () => ({
    format: (mm: number) => `${mm}mm`,
    inputValue: (mm: number) => String(mm),
    toMm: (v: number) => v,
  }),
}));

afterEach(() => {
  cleanup();
  setSettings.mockClear();
  settings = { sawKerf: 3, freshEdge: true, freshEdgeTrim: 10 };
});

describe('KerfSettings', () => {
  it('toggles freshEdge when the switch is clicked', () => {
    const { getByRole } = render(<KerfSettings />);
    fireEvent.click(getByRole('button'));
    expect(setSettings).toHaveBeenCalledWith({ freshEdge: false });
  });

  it('updates sawKerf on a valid numeric change', () => {
    const { container } = render(<KerfSettings />);
    const inputs = container.querySelectorAll('input[type="number"]');
    const sawKerfInput = inputs[inputs.length - 1];
    fireEvent.change(sawKerfInput, { target: { value: '5' } });
    expect(setSettings).toHaveBeenCalledWith({ sawKerf: 5 });
  });

  it('ignores an empty sawKerf value instead of setting NaN', () => {
    const { container } = render(<KerfSettings />);
    const inputs = container.querySelectorAll('input[type="number"]');
    const sawKerfInput = inputs[inputs.length - 1];
    fireEvent.change(sawKerfInput, { target: { value: '' } });
    expect(setSettings).not.toHaveBeenCalled();
  });

  it('ignores a negative sawKerf value', () => {
    const { container } = render(<KerfSettings />);
    const inputs = container.querySelectorAll('input[type="number"]');
    const sawKerfInput = inputs[inputs.length - 1];
    fireEvent.change(sawKerfInput, { target: { value: '-1' } });
    expect(setSettings).not.toHaveBeenCalled();
  });

  it('does not render the fresh-edge trim field when freshEdge is off', () => {
    settings = { sawKerf: 3, freshEdge: false, freshEdgeTrim: 10 };
    const { container } = render(<KerfSettings />);
    expect(container.querySelectorAll('input[type="number"]')).toHaveLength(1);
  });

  it('updates freshEdgeTrim on a valid numeric change', () => {
    const { container } = render(<KerfSettings />);
    const inputs = container.querySelectorAll('input[type="number"]');
    const trimInput = inputs[0];
    fireEvent.change(trimInput, { target: { value: '15' } });
    expect(setSettings).toHaveBeenCalledWith({ freshEdgeTrim: 15 });
  });

  it('associates the numeric fields with their labels, and the toggle with an accessible name', () => {
    render(<KerfSettings />);
    expect(screen.getByLabelText(/Trim per side/)).toBeTruthy();
    expect(screen.getByLabelText(/Saw Kerf/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fresh Edge' })).toBeTruthy();
  });
});
