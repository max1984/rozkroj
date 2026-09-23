// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { Toolbar } from './Toolbar';
import type { LayoutResult, MaterialStock, PieceDefinition, Project } from '../../types';

interface Temporal {
  undo: () => void;
  redo: () => void;
  pastStates: unknown[];
  futureStates: unknown[];
}

// vi.mock factories are hoisted above the rest of the module, so anything
// they close over has to live in vi.hoisted — and imported bindings (like
// zustand's `create`) aren't initialized yet inside that callback. So the
// real temporal store is built as an ordinary top-level statement below, and
// the mock exposes it through a lazily-read getter instead of a direct
// reference captured at factory-definition time.
const H = vi.hoisted(() => ({
  setProjectName: vi.fn(),
  toggleDarkMode: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  exportProject: vi.fn(),
  mutable: {
    projectName: 'My Project', darkMode: false, hasUnsavedChanges: false,
    pieces: [] as PieceDefinition[], layout: null as LayoutResult | null,
    materials: [] as MaterialStock[],
  },
  temporalStoreRef: { current: null as UseBoundStore<StoreApi<Temporal>> | null },
}));

function state() {
  return {
    projectName: H.mutable.projectName, setProjectName: H.setProjectName,
    darkMode: H.mutable.darkMode, toggleDarkMode: H.toggleDarkMode,
    hasUnsavedChanges: H.mutable.hasUnsavedChanges,
    pieces: H.mutable.pieces, unit: 'mm' as const, materials: H.mutable.materials,
    layout: H.mutable.layout, exportProject: H.exportProject,
  };
}

vi.mock('../../store', () => {
  const useStore = (selector: (s: ReturnType<typeof state>) => unknown) => selector(state());
  useStore.getState = () => state();
  Object.defineProperty(useStore, 'temporal', { get: () => H.temporalStoreRef.current });
  return { useStore };
});

const save = vi.fn();
const loadFromFile = vi.fn();
const exportToFile = vi.fn();
vi.mock('../../hooks/useLocalStorage', () => ({
  useSaveLoad: () => ({ save, loadFromFile, exportToFile }),
}));

const exportCsv = vi.fn();
vi.mock('../../utils/csv', () => ({ exportCsv: (...args: unknown[]) => exportCsv(...args) }));

const generatePdf = vi.fn<(...args: unknown[]) => Promise<void>>(() => Promise.resolve());
vi.mock('../../utils/pdf', () => ({ generatePdf: (...args: unknown[]) => generatePdf(...args) }));

vi.mock('./ProjectLibrary', () => ({ ProjectLibrary: () => <div data-testid="project-library" /> }));

// The real temporal store, built now that zustand's `create` import has resolved.
H.temporalStoreRef.current = create<Temporal>(() => ({ undo: H.undo, redo: H.redo, pastStates: [], futureStates: [] }));
const temporalStore = H.temporalStoreRef.current;

function exportedProject(): Project {
  return {
    id: 'proj-1', name: H.mutable.projectName, createdAt: 0, updatedAt: 0,
    settings: { sawKerf: 3, freshEdge: true, freshEdgeTrim: 10 },
    materials: H.mutable.materials, unit: 'mm', algorithm: 'maxrects', pieces: H.mutable.pieces, offcutStock: [],
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  H.mutable.projectName = 'My Project';
  H.mutable.darkMode = false;
  H.mutable.hasUnsavedChanges = false;
  H.mutable.pieces = [];
  H.mutable.layout = null;
  temporalStore.setState({ pastStates: [], futureStates: [] });
});

describe('Toolbar', () => {
  it('renders the project name and updates it via setProjectName', () => {
    render(<Toolbar />);
    const nameInput = screen.getByDisplayValue('My Project');
    fireEvent.change(nameInput, { target: { value: 'Kitchen' } });
    expect(H.setProjectName).toHaveBeenCalledWith('Kitchen');
  });

  it('disables undo/redo with empty history and enables them with history present', () => {
    const { rerender } = render(<Toolbar />);
    const undoBtn = screen.getByTitle('Undo (⌘Z)') as HTMLButtonElement;
    const redoBtn = screen.getByTitle('Redo (⌘⇧Z)') as HTMLButtonElement;
    expect(undoBtn.disabled).toBe(true);
    expect(redoBtn.disabled).toBe(true);

    temporalStore.setState({ pastStates: [{}], futureStates: [{}] });
    rerender(<Toolbar />);
    expect((screen.getByTitle('Undo (⌘Z)') as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByTitle('Redo (⌘⇧Z)') as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(screen.getByTitle('Undo (⌘Z)'));
    expect(H.undo).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle('Redo (⌘⇧Z)'));
    expect(H.redo).toHaveBeenCalledTimes(1);
  });

  it('saves the project when the save button is clicked', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByTitle('Save project'));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('exports the project file when the download button is clicked', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByTitle('Export project file'));
    expect(exportToFile).toHaveBeenCalledTimes(1);
  });

  it('loads a project file on import', () => {
    const { container } = render(<Toolbar />);
    const fileInput = container.querySelector('input[type="file"][accept*="json"]')!;
    const file = new File(['{}'], 'proj.rozkroj.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(loadFromFile).toHaveBeenCalledWith(file);
  });

  it('disables CSV export when there are no pieces, enables it when there are', () => {
    const { rerender } = render(<Toolbar />);
    expect((screen.getByTitle('Export cut list as CSV') as HTMLButtonElement).disabled).toBe(true);

    H.mutable.pieces = [{ id: 'p1', name: 'A', materialId: 'm1', width: 100, height: 100, quantity: 1, grain: 'none', rotationAllowed: true, priority: false, edgeBanding: { top: false, right: false, bottom: false, left: false }, color: '#000' }];
    rerender(<Toolbar />);
    const csvBtn = screen.getByTitle('Export cut list as CSV') as HTMLButtonElement;
    expect(csvBtn.disabled).toBe(false);
    fireEvent.click(csvBtn);
    expect(exportCsv).toHaveBeenCalledWith(H.mutable.pieces, H.mutable.materials, 'mm');
  });

  it('disables the PDF button until a layout with sheets exists', () => {
    const { rerender } = render(<Toolbar />);
    expect((screen.getByText('PDF').closest('button') as HTMLButtonElement).disabled).toBe(true);

    H.mutable.layout = { sheets: [{ sheetIndex: 0, materialId: 'm1', width: 100, height: 100, placedPieces: [], freeRects: [], usableArea: 10000, wastedArea: 0, wastePercent: 0 }], unplacedPieces: [], totalWastePercent: 0, materialUsage: [], totalCost: 0, computedAt: 0 };
    rerender(<Toolbar />);
    expect((screen.getByText('PDF').closest('button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('opens the PDF options panel and generates the PDF on demand', async () => {
    H.mutable.layout = { sheets: [{ sheetIndex: 0, materialId: 'm1', width: 100, height: 100, placedPieces: [], freeRects: [], usableArea: 10000, wastedArea: 0, wastePercent: 0 }], unplacedPieces: [], totalWastePercent: 0, materialUsage: [], totalCost: 0, computedAt: 0 };
    H.exportProject.mockImplementation(exportedProject);
    render(<Toolbar />);
    const pdfBtn = screen.getByText('PDF').closest('button')!;
    expect(pdfBtn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(pdfBtn);
    expect(pdfBtn.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Download PDF')).toBeTruthy();

    fireEvent.click(screen.getByText('Download PDF'));
    await vi.waitFor(() => expect(generatePdf).toHaveBeenCalledTimes(1));
    expect(generatePdf.mock.calls[0][0]).toBe(H.mutable.layout);
    expect(H.exportProject).toHaveBeenCalledTimes(1);
  });

  it('toggles dark mode', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByTitle('Toggle theme'));
    expect(H.toggleDarkMode).toHaveBeenCalledTimes(1);
  });

  it('shows an unsaved-changes indicator only when there are unsaved changes', () => {
    const { rerender } = render(<Toolbar />);
    expect(screen.queryByTitle('Unsaved changes')).toBeNull();
    expect(screen.getByTitle('Save project')).toBeTruthy();

    H.mutable.hasUnsavedChanges = true;
    rerender(<Toolbar />);
    expect(screen.getByTitle('Unsaved changes')).toBeTruthy();
    expect(screen.getByTitle('Save project (unsaved changes)')).toBeTruthy();
  });
});
