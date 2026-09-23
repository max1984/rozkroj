// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import App from './App';

interface Temporal {
  undo: () => void;
  redo: () => void;
  pastStates: unknown[];
  futureStates: unknown[];
}

const H = vi.hoisted(() => ({
  undo: vi.fn(),
  redo: vi.fn(),
  mutable: { darkMode: false, hasUnsavedChanges: false },
  temporalStoreRef: { current: null as UseBoundStore<StoreApi<Temporal>> | null },
}));

vi.mock('./store', () => {
  const useStore = (selector: (s: { darkMode: boolean }) => unknown) => selector({ darkMode: H.mutable.darkMode });
  useStore.getState = () => ({ hasUnsavedChanges: H.mutable.hasUnsavedChanges });
  Object.defineProperty(useStore, 'temporal', { get: () => H.temporalStoreRef.current });
  return { useStore };
});

vi.mock('./components/toolbar/Toolbar', () => ({ Toolbar: () => <div data-testid="toolbar" /> }));
vi.mock('./components/layout/Sidebar', () => ({ Sidebar: () => <div data-testid="sidebar" /> }));
vi.mock('./components/visualization/LayoutViewer', () => ({ LayoutViewer: () => <div data-testid="layout-viewer" /> }));
vi.mock('./components/visualization/SummaryPanel', () => ({ SummaryPanel: () => <div data-testid="summary-panel" /> }));

H.temporalStoreRef.current = create<Temporal>(() => ({ undo: H.undo, redo: H.redo, pastStates: [], futureStates: [] }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  H.mutable.darkMode = false;
  H.mutable.hasUnsavedChanges = false;
  document.documentElement.classList.remove('dark');
});

describe('App', () => {
  it('adds the dark class to the document root when darkMode is on', () => {
    H.mutable.darkMode = true;
    render(<App />);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('does not add the dark class when darkMode is off', () => {
    render(<App />);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('undoes on Cmd/Ctrl+Z outside of a text field', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    expect(H.undo).toHaveBeenCalledTimes(1);
  });

  it('redoes on Cmd/Ctrl+Shift+Z outside of a text field', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'z', metaKey: true, shiftKey: true });
    expect(H.redo).toHaveBeenCalledTimes(1);
  });

  it('does not undo when Cmd/Ctrl+Z is pressed while focused in a text input (regression)', () => {
    render(<App />);
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: 'z', metaKey: true });

    expect(H.undo).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('warns before unload when there are unsaved changes', () => {
    H.mutable.hasUnsavedChanges = true;
    render(<App />);
    const event = new Event('beforeunload', { cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('does not warn before unload when everything is saved', () => {
    H.mutable.hasUnsavedChanges = false;
    render(<App />);
    const event = new Event('beforeunload', { cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });
});
