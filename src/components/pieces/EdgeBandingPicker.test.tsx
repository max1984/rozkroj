// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { EdgeBandingPicker } from './EdgeBandingPicker';
import type { EdgeBanding } from '../../types';

const NONE: EdgeBanding = { top: false, right: false, bottom: false, left: false };

afterEach(cleanup);

describe('EdgeBandingPicker', () => {
  it('renders one toggle button per edge', () => {
    const { container } = render(<EdgeBandingPicker value={NONE} onChange={vi.fn()} />);
    expect(container.querySelectorAll('button')).toHaveLength(4);
  });

  it('toggles the clicked edge on, leaving the others untouched', () => {
    const onChange = vi.fn();
    const { getByTitle } = render(<EdgeBandingPicker value={NONE} onChange={onChange} />);
    fireEvent.click(getByTitle('Top edge'));
    expect(onChange).toHaveBeenCalledWith({ top: true, right: false, bottom: false, left: false });
  });

  it('toggles an already-banded edge back off', () => {
    const onChange = vi.fn();
    const value: EdgeBanding = { top: true, right: false, bottom: false, left: false };
    const { getByTitle } = render(<EdgeBandingPicker value={value} onChange={onChange} />);
    fireEvent.click(getByTitle('Top edge'));
    expect(onChange).toHaveBeenCalledWith({ top: false, right: false, bottom: false, left: false });
  });

  it('toggles each of the four edges independently', () => {
    const onChange = vi.fn();
    const { getByTitle } = render(<EdgeBandingPicker value={NONE} onChange={onChange} />);

    fireEvent.click(getByTitle('Right edge'));
    expect(onChange).toHaveBeenLastCalledWith({ top: false, right: true, bottom: false, left: false });

    fireEvent.click(getByTitle('Bottom edge'));
    expect(onChange).toHaveBeenLastCalledWith({ top: false, right: false, bottom: true, left: false });

    fireEvent.click(getByTitle('Left edge'));
    expect(onChange).toHaveBeenLastCalledWith({ top: false, right: false, bottom: false, left: true });
  });

  it('reflects banded state via aria-pressed for assistive tech', () => {
    const value: EdgeBanding = { top: true, right: false, bottom: false, left: false };
    const { getByTitle } = render(<EdgeBandingPicker value={value} onChange={vi.fn()} />);
    expect(getByTitle('Top edge').getAttribute('aria-pressed')).toBe('true');
    expect(getByTitle('Right edge').getAttribute('aria-pressed')).toBe('false');
  });
});
