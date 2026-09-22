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
});
