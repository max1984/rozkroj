// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AlgorithmPicker } from './AlgorithmPicker';

let algorithm: 'maxrects' | 'easycut' = 'maxrects';
const setAlgorithm = vi.fn();

vi.mock('../../store', () => ({
  useStore: (selector: (s: { algorithm: 'maxrects' | 'easycut'; setAlgorithm: typeof setAlgorithm }) => unknown) =>
    selector({ algorithm, setAlgorithm }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  algorithm = 'maxrects';
});

describe('AlgorithmPicker', () => {
  it('calls setAlgorithm with "easycut" when Easy Cut is clicked', () => {
    render(<AlgorithmPicker />);
    fireEvent.click(screen.getByText('Easy Cut'));
    expect(setAlgorithm).toHaveBeenCalledWith('easycut');
  });

  it('calls setAlgorithm with "maxrects" when Optimal is clicked', () => {
    algorithm = 'easycut';
    render(<AlgorithmPicker />);
    fireEvent.click(screen.getByText('Optimal'));
    expect(setAlgorithm).toHaveBeenCalledWith('maxrects');
  });

  it('highlights the currently selected algorithm', () => {
    const { container } = render(<AlgorithmPicker />);
    const buttons = container.querySelectorAll('button');
    const optimalBtn = Array.from(buttons).find(b => b.textContent?.includes('Optimal'))!;
    expect(optimalBtn.className).toContain('border-accent');
  });
});
