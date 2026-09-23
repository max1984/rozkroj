// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// The fallback UI reads the store directly (a class component can't use the
// useTranslation() hook) — mock it so this test doesn't pull in the real
// store's module-load bootstrap, which touches localStorage in a way Node's
// built-in global (broken without --localstorage-file) conflicts with even
// under the jsdom pragma.
vi.mock('../store', () => ({
  useStore: { getState: () => ({ language: undefined }) },
}));

function Bomb(): never {
  throw new Error('boom');
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders children normally when nothing throws', () => {
    render(
      <ErrorBoundary>
        <div>All good</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeTruthy();
  });

  it('shows a fallback instead of a blank page when a child throws during render', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); // silence React's own error logging
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.queryByText('All good')).toBeNull();
  });

  it('reloads the page when the Reload button is clicked', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reloadSpy = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload: reloadSpy });

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByText('Reload'));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
