import { create } from 'zustand';
import { temporal } from 'zundo';
import { nanoid } from 'nanoid';
import type { PieceDefinition, CuttingSettings, MaterialStock, OffcutItem, LayoutResult, Project } from '../types';
import { DEFAULT_SHEET_SIZE } from '../constants/sheetSizes';
import { DEFAULT_SAW_KERF, DEFAULT_FRESH_EDGE_TRIM, DEFAULT_MATERIAL_NAME } from '../constants/defaults';
import { getPieceColor } from '../utils/colors';
import { runOptimizer } from '../algorithms/optimizer';
import { migrateProject } from '../utils/migrateProject';

interface AppState {
  // Project meta
  projectId: string;
  projectName: string;

  // Settings
  unit: 'mm' | 'inch';
  algorithm: 'maxrects' | 'easycut';
  settings: CuttingSettings;

  // Materials (stock sheets available for this project)
  materials: MaterialStock[];

  // Pieces
  pieces: PieceDefinition[];

  // Layout (computed, not in undo history)
  layout: LayoutResult | null;

  // UI state (not in undo history)
  selectedPieceId: string | null;
  hoveredPieceId: string | null;
  darkMode: boolean;

  // Offcuts (saved stock)
  offcutStock: OffcutItem[];

  // Actions
  setProjectName: (name: string) => void;
  setUnit: (unit: 'mm' | 'inch') => void;
  setAlgorithm: (alg: 'maxrects' | 'easycut') => void;
  setSettings: (s: Partial<CuttingSettings>) => void;

  addMaterial: (m: Omit<MaterialStock, 'id' | 'color'>) => void;
  updateMaterial: (id: string, m: Partial<MaterialStock>) => void;
  removeMaterial: (id: string) => void;

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

  addOffcut: (materialId: string, w: number, h: number) => void;
  removeOffcut: (id: string) => void;
}

const DEFAULT_SETTINGS: CuttingSettings = {
  sawKerf: DEFAULT_SAW_KERF,
  freshEdge: true,
  freshEdgeTrim: DEFAULT_FRESH_EDGE_TRIM,
};

function defaultMaterial(): MaterialStock {
  return {
    id: nanoid(),
    name: DEFAULT_MATERIAL_NAME,
    color: getPieceColor(0),
    size: DEFAULT_SHEET_SIZE,
    pricePerSheet: 0,
  };
}

export const useStore = create<AppState>()(
  temporal(
    (set, get) => ({
      projectId: nanoid(),
      projectName: 'My Project',
      unit: 'mm',
      algorithm: 'maxrects',
      settings: DEFAULT_SETTINGS,
      materials: [defaultMaterial()],
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

      addMaterial: (m) => {
        const material: MaterialStock = { ...m, id: nanoid(), color: getPieceColor(get().materials.length) };
        set(state => ({ materials: [...state.materials, material] }));
      },
      updateMaterial: (id, m) => {
        set(state => ({ materials: state.materials.map(x => x.id === id ? { ...x, ...m } : x) }));
        get().recomputeLayout();
      },
      removeMaterial: (id) => {
        const { materials, pieces } = get();
        if (materials.length <= 1) return;
        const fallback = materials.find(m => m.id !== id);
        if (!fallback) return;
        set({
          materials: materials.filter(m => m.id !== id),
          pieces: pieces.map(p => p.materialId === id ? { ...p, materialId: fallback.id } : p),
        });
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
        const { pieces, materials, offcutStock, settings, algorithm } = get();
        const layout = runOptimizer(pieces, materials, offcutStock, settings, algorithm);
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
          materials: project.materials,
          pieces: project.pieces,
          offcutStock: project.offcutStock,
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
          materials: s.materials,
          unit: s.unit,
          algorithm: s.algorithm,
          pieces: s.pieces,
          offcutStock: s.offcutStock,
        };
      },

      addOffcut: (materialId, w, h) => {
        set(state => ({
          offcutStock: [...state.offcutStock, { id: nanoid(), materialId, width: w, height: h, label: `${w}×${h} mm` }],
        }));
        get().recomputeLayout();
      },
      removeOffcut: (id) => {
        set(state => ({ offcutStock: state.offcutStock.filter(o => o.id !== id) }));
        get().recomputeLayout();
      },
    }),
    {
      // Only track pieces, materials, settings, algorithm in undo history
      partialize: (state) => ({
        pieces: state.pieces,
        materials: state.materials,
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
    const project = migrateProject(JSON.parse(saved));
    useStore.getState().loadProject(project);
  } catch { /* ignore corrupt save */ }
}
