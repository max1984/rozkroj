// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { UnitToggle } from './UnitToggle';

let unit: 'mm' | 'inch' = 'mm';
const setUnit = vi.fn();

vi.mock('../../store', () => ({
  useStore: (selector: (s: { unit: 'mm' | 'inch'; setUnit: typeof setUnit }) => unknown) =>
    selector({ unit, setUnit }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  unit = 'mm';
});

describe('UnitToggle', () => {
  it('calls setUnit with "inch" when the inch button is clicked', () => {
    render(<UnitToggle />);
    fireEvent.click(screen.getByText('inch'));
    expect(setUnit).toHaveBeenCalledWith('inch');
  });

  it('calls setUnit with "mm" when the mm button is clicked', () => {
    unit = 'inch';
    render(<UnitToggle />);
    fireEvent.click(screen.getByText('mm'));
    expect(setUnit).toHaveBeenCalledWith('mm');
  });

  it('marks the active unit as pressed for assistive tech, and the other as not', () => {
    render(<UnitToggle />);
    expect(screen.getByText('mm').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('inch').getAttribute('aria-pressed')).toBe('false');
  });
});
