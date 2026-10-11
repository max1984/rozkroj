// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { useSaveLoad } from './useLocalStorage';

const saveProject = vi.fn();
const loadProject = vi.fn();
// loadFromFile defers to the store's own confirmDiscardUnsaved() action
// (store/index.ts) instead of reading hasUnsavedChanges + calling confirm()
// itself — this mock exercises exactly that boundary, the same way
// ProjectLibrary.test.tsx mocks newProject/duplicateProject/loadProjectById's
// boolean return values instead of re-testing the confirmation dialog here.
const confirmDiscardUnsaved = vi.fn(() => true);

vi.mock('../store', () => {
  const useStore = (selector: (s: {
    saveProject: typeof saveProject; loadProject: typeof loadProject; confirmDiscardUnsaved: typeof confirmDiscardUnsaved;
  }) => unknown) => selector({ saveProject, loadProject, confirmDiscardUnsaved });
  useStore.getState = () => ({ exportProject: vi.fn(() => ({ name: 'My Project' })) });
  return { useStore };
});

vi.mock('../utils/migrateProject', () => ({
  migrateProject: (raw: unknown) => raw,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  confirmDiscardUnsaved.mockReturnValue(true);
});

describe('useSaveLoad.loadFromFile', () => {
  it('loads the parsed project when confirmDiscardUnsaved() returns true', async () => {
    const { result } = renderHook(() => useSaveLoad());
    const file = new File([JSON.stringify({ name: 'Imported' })], 'p.rozkroj.json', { type: 'application/json' });

    result.current.loadFromFile(file);

    expect(confirmDiscardUnsaved).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(loadProject).toHaveBeenCalledWith({ name: 'Imported' }));
  });

  it('does not read or load the file when confirmDiscardUnsaved() returns false', () => {
    confirmDiscardUnsaved.mockReturnValue(false);
    const { result } = renderHook(() => useSaveLoad());
    const file = new File([JSON.stringify({ name: 'Imported' })], 'p.rozkroj.json', { type: 'application/json' });

    result.current.loadFromFile(file);

    // Cancelling short-circuits before the (async) FileReader is even started.
    expect(loadProject).not.toHaveBeenCalled();
  });

  it('alerts on invalid JSON instead of throwing', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { result } = renderHook(() => useSaveLoad());
    const file = new File(['not valid json'], 'bad.json', { type: 'application/json' });

    result.current.loadFromFile(file);

    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Invalid project file.'));
    expect(loadProject).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('alerts when the file cannot be read', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const RealFileReader = window.FileReader;
    class FailingFileReader {
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      readAsText() {
        setTimeout(() => this.onerror?.(), 0);
      }
    }
    // @ts-expect-error -- minimal stub, only what loadFromFile touches
    window.FileReader = FailingFileReader;
    const { result } = renderHook(() => useSaveLoad());
    const file = new File(['{}'], 'p.rozkroj.json', { type: 'application/json' });

    result.current.loadFromFile(file);

    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Could not read the file.'));
    expect(loadProject).not.toHaveBeenCalled();
    window.FileReader = RealFileReader;
    alertSpy.mockRestore();
  });
});

describe('useSaveLoad.save', () => {
  it('calls saveProject', () => {
    const { result } = renderHook(() => useSaveLoad());
    result.current.save();
    expect(saveProject).toHaveBeenCalledTimes(1);
  });
});
