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

  it('updates sawKerf on blur with a valid value', () => {
    const { container } = render(<KerfSettings />);
    const inputs = container.querySelectorAll('input[type="number"]');
    const sawKerfInput = inputs[inputs.length - 1];
    fireEvent.blur(sawKerfInput, { target: { value: '5' } });
    expect(setSettings).toHaveBeenCalledWith({ sawKerf: 5 });
  });

  it(
    'lets a decimal sawKerf be typed character-by-character instead of being stripped mid-typing — ' +
      'the field used to be fully controlled, re-committing parseFloat(text) on every change and ' +
      'reformatting the input back to the plain integer the moment the trailing "." was typed, making ' +
      'it impossible to ever reach a value like 2.5',
    () => {
      const { container } = render(<KerfSettings />);
      const inputs = container.querySelectorAll('input[type="number"]');
      const sawKerfInput = inputs[inputs.length - 1] as HTMLInputElement;
      fireEvent.change(sawKerfInput, { target: { value: '2' } });
      fireEvent.change(sawKerfInput, { target: { value: '2.' } });
      fireEvent.change(sawKerfInput, { target: { value: '2.5' } });
      expect(setSettings).not.toHaveBeenCalled();  // uncontrolled — no commit until blur
      fireEvent.blur(sawKerfInput, { target: { value: '2.5' } });
      expect(setSettings).toHaveBeenCalledWith({ sawKerf: 2.5 });
    }
  );

  it('ignores an empty sawKerf value instead of setting NaN', () => {
    const { container } = render(<KerfSettings />);
    const inputs = container.querySelectorAll('input[type="number"]');
    const sawKerfInput = inputs[inputs.length - 1];
    fireEvent.blur(sawKerfInput, { target: { value: '' } });
    expect(setSettings).not.toHaveBeenCalled();
  });

  it('ignores a negative sawKerf value', () => {
    const { container } = render(<KerfSettings />);
    const inputs = container.querySelectorAll('input[type="number"]');
    const sawKerfInput = inputs[inputs.length - 1];
    fireEvent.blur(sawKerfInput, { target: { value: '-1' } });
    expect(setSettings).not.toHaveBeenCalled();
  });

  it('ignores an unedited sawKerf blur (same value re-blurred)', () => {
    const { container } = render(<KerfSettings />);
    const inputs = container.querySelectorAll('input[type="number"]');
    const sawKerfInput = inputs[inputs.length - 1] as HTMLInputElement;
    fireEvent.blur(sawKerfInput, { target: { value: sawKerfInput.value } });
    expect(setSettings).not.toHaveBeenCalled();
  });

  it('does not render the fresh-edge trim field when freshEdge is off', () => {
    settings = { sawKerf: 3, freshEdge: false, freshEdgeTrim: 10 };
    const { container } = render(<KerfSettings />);
    expect(container.querySelectorAll('input[type="number"]')).toHaveLength(1);
  });

  it('updates freshEdgeTrim on blur with a valid value', () => {
    const { container } = render(<KerfSettings />);
    const inputs = container.querySelectorAll('input[type="number"]');
    const trimInput = inputs[0];
    fireEvent.blur(trimInput, { target: { value: '15' } });
    expect(setSettings).toHaveBeenCalledWith({ freshEdgeTrim: 15 });
  });

  it('associates the numeric fields with their labels, and the toggle with an accessible name', () => {
    render(<KerfSettings />);
    expect(screen.getByLabelText(/Trim per side/)).toBeTruthy();
    expect(screen.getByLabelText(/Saw Kerf/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fresh Edge' })).toBeTruthy();
  });
});
