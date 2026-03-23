import { create } from 'zustand';
import { temporal } from 'zundo';
import { nanoid } from 'nanoid';
import type { PieceDefinition, SheetSettings, LayoutResult, Project } from '../types';
import { DEFAULT_SHEET_SIZE, STANDARD_SHEET_SIZES } from '../constants/sheetSizes';
import { DEFAULT_SAW_KERF, DEFAULT_FRESH_EDGE_TRIM } from '../constants/defaults';
import { getPieceColor } from '../utils/colors';
import { runOptimizer } from '../algorithms/optimizer';

interface AppState {
  // Project meta
  projectId: string;
  projectName: string;

  // Settings
  unit: 'mm' | 'inch';
  algorithm: 'maxrects' | 'easycut';
  settings: SheetSettings;

  // Pieces
  pieces: PieceDefinition[];

  // Layout (computed, not in undo history)
  layout: LayoutResult | null;

  // UI state (not in undo history)
  selectedPieceId: string | null;
  hoveredPieceId: string | null;
  darkMode: boolean;

  // Offcuts (saved stock)
  offcutStock: { width: number; height: number; label: string }[];

  // Actions
  setProjectName: (name: string) => void;
  setUnit: (unit: 'mm' | 'inch') => void;
  setAlgorithm: (alg: 'maxrects' | 'easycut') => void;
  setSettings: (s: Partial<SheetSettings>) => void;

  addPiece: (p: Omit<PieceDefinition, 'id' | 'color'>) => void;
  updatePiece: (id: string, p: Partial<PieceDefinition>) => void;
  removePiece: (id: string) => void;
  setPieces: (pieces: PieceDefinition[]) => void;

  recomputeLayout: () => void;
  setSelectedPieceId: (id: string | null) => void;
  setHoveredPieceId: (id: string | null) => void;
  toggleDarkMode: () => void;

  saveProject: () => void;
  loadProject: (project: Project) => void;
  exportProject: () => Project;

  addOffcut: (w: number, h: number) => void;
  removeOffcut: (index: number) => void;
}

const DEFAULT_SETTINGS: SheetSettings = {
  size: DEFAULT_SHEET_SIZE,
  sawKerf: DEFAULT_SAW_KERF,
  freshEdge: true,
  freshEdgeTrim: DEFAULT_FRESH_EDGE_TRIM,
};

export const useStore = create<AppState>()(
  temporal(
    (set, get) => ({
      projectId: nanoid(),
      projectName: 'My Project',
      unit: 'mm',
      algorithm: 'maxrects',
      settings: DEFAULT_SETTINGS,
      pieces: [],
      layout: null,
      selectedPieceId: null,
      hoveredPieceId: null,
      darkMode: false,
      offcutStock: [],

      setProjectName: (name) => set({ projectName: name }),
      setUnit: (unit) => set({ unit }),
      setAlgorithm: (algorithm) => {
        set({ algorithm });
        get().recomputeLayout();
      },
      setSettings: (s) => {
        set(state => ({ settings: { ...state.settings, ...s } }));
        get().recomputeLayout();
      },

      addPiece: (p) => {
        const color = getPieceColor(get().pieces.length);
        const piece: PieceDefinition = { ...p, id: nanoid(), color };
        set(state => ({ pieces: [...state.pieces, piece] }));
        get().recomputeLayout();
      },
      updatePiece: (id, p) => {
        set(state => ({ pieces: state.pieces.map(x => x.id === id ? { ...x, ...p } : x) }));
        get().recomputeLayout();
      },
      removePiece: (id) => {
        set(state => ({ pieces: state.pieces.filter(x => x.id !== id) }));
        get().recomputeLayout();
      },
      setPieces: (pieces) => {
        set({ pieces });
        get().recomputeLayout();
      },

      recomputeLayout: () => {
        const { pieces, settings, algorithm } = get();
        const layout = runOptimizer(pieces, settings, algorithm);
        set({ layout });
      },

      setSelectedPieceId: (id) => set({ selectedPieceId: id }),
      setHoveredPieceId: (id) => set({ hoveredPieceId: id }),
      toggleDarkMode: () => set(state => ({ darkMode: !state.darkMode })),

      saveProject: () => {
        const project = get().exportProject();
        localStorage.setItem('rozkroj_project', JSON.stringify(project));
      },
      loadProject: (project) => {
        set({
          projectId: project.id,
          projectName: project.name,
          unit: project.unit,
          algorithm: project.algorithm,
          settings: project.settings,
          pieces: project.pieces,
        });
        get().recomputeLayout();
      },
      exportProject: (): Project => {
        const s = get();
        return {
          id: s.projectId,
          name: s.projectName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          settings: s.settings,
          unit: s.unit,
          algorithm: s.algorithm,
          pieces: s.pieces,
        };
      },

      addOffcut: (w, h) => {
        set(state => ({
          offcutStock: [...state.offcutStock, { width: w, height: h, label: `${w}×${h} mm` }],
        }));
      },
      removeOffcut: (index) => {
        set(state => ({ offcutStock: state.offcutStock.filter((_, i) => i !== index) }));
      },
    }),
    {
      // Only track pieces, settings, algorithm in undo history
      partialize: (state) => ({
        pieces: state.pieces,
        settings: state.settings,
        algorithm: state.algorithm,
        projectName: state.projectName,
      }),
    }
  )
);

// Load saved project on startup
const saved = localStorage.getItem('rozkroj_project');
if (saved) {
  try {
    const project: Project = JSON.parse(saved);
    // Restore standard sheet size object reference
    const matchedSize = STANDARD_SHEET_SIZES.find(
      s => s.width === project.settings.size.width && s.height === project.settings.size.height
    ) || project.settings.size;
    project.settings.size = matchedSize;
    useStore.getState().loadProject(project);
  } catch { /* ignore corrupt save */ }
}
