import { create } from 'zustand';
import { shallow } from 'zustand/shallow';
import { getInitialDarkMode, persistDarkMode } from '../utils/darkMode';
import { getLastUnit, persistLastUnit } from '../utils/unitPreference';
import { getInitialLanguage, persistLanguage } from '../utils/languagePreference';
import type { Language } from '../i18n/types';
import { TRANSLATIONS } from '../i18n';
import { temporal } from 'zundo';
import { nanoid } from 'nanoid';
import type { PieceDefinition, CuttingSettings, MaterialStock, OffcutItem, LayoutResult, Project } from '../types';
import { DEFAULT_SHEET_SIZE } from '../constants/sheetSizes';
import { DEFAULT_SAW_KERF, DEFAULT_FRESH_EDGE_TRIM } from '../constants/defaults';
import { getPieceColor } from '../utils/colors';
import { runOptimizer } from '../algorithms/optimizer';
import {
  saveProjectToLibrary,
  loadProjectFromLibrary,
  deleteProjectFromLibrary,
  migrateLegacySingleProject,
  getActiveProjectId,
  setActiveProjectId,
} from '../utils/projectLibrary';

interface AppState {
  // Project meta
  projectId: string;
  projectName: string;
  projectCreatedAt: number;

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
  language: Language;
  hasUnsavedChanges: boolean;

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
  duplicatePiece: (id: string) => void;
  setPieces: (pieces: PieceDefinition[]) => void;

  recomputeLayout: () => void;
  setSelectedPieceId: (id: string | null) => void;
  setHoveredPieceId: (id: string | null) => void;
  toggleDarkMode: () => void;
  setLanguage: (language: Language) => void;

  saveProject: () => void;
  loadProject: (project: Project) => void;
  exportProject: () => Project;

  newProject: () => void;
  duplicateProject: () => void;
  loadProjectById: (id: string) => void;
  deleteProjectById: (id: string) => void;

  addOffcut: (materialId: string, w: number, h: number) => void;
  removeOffcut: (id: string) => void;
}

const DEFAULT_SETTINGS: CuttingSettings = {
  sawKerf: DEFAULT_SAW_KERF,
  freshEdge: true,
  freshEdgeTrim: DEFAULT_FRESH_EDGE_TRIM,
};

function defaultMaterial(language: Language): MaterialStock {
  return {
    id: nanoid(),
    name: (TRANSLATIONS[language] ?? TRANSLATIONS.en).defaultMaterialName,
    color: getPieceColor(0),
    size: DEFAULT_SHEET_SIZE,
    pricePerSheet: 0,
  };
}

function blankProject(language: Language, name?: string) {
  return {
    projectId: nanoid(),
    projectName: name ?? (TRANSLATIONS[language] ?? TRANSLATIONS.en).defaultProjectName,
    projectCreatedAt: Date.now(),
    unit: getLastUnit(),
    algorithm: 'maxrects' as const,
    settings: DEFAULT_SETTINGS,
    materials: [defaultMaterial(language)],
    pieces: [],
    offcutStock: [],
  };
}

export const useStore = create<AppState>()(
  temporal(
    (set, get) => ({
      ...blankProject(getInitialLanguage()),
      layout: null,
      selectedPieceId: null,
      hoveredPieceId: null,
      darkMode: getInitialDarkMode(),
      language: getInitialLanguage(),
      hasUnsavedChanges: false,

      setProjectName: (name) => set({ projectName: name }),
      setUnit: (unit) => {
        set({ unit });
        persistLastUnit(unit);
      },
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
        const { materials, pieces, offcutStock } = get();
        if (materials.length <= 1) return;
        const fallback = materials.find(m => m.id !== id);
        if (!fallback) return;
        set({
          materials: materials.filter(m => m.id !== id),
          pieces: pieces.map(p => p.materialId === id ? { ...p, materialId: fallback.id } : p),
          // Offcuts are physical scrap of the removed material's sheet stock — they
          // can't be reassigned to another material, so they're no longer usable.
          offcutStock: offcutStock.filter(o => o.materialId !== id),
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
      duplicatePiece: (id) => {
        set(state => {
          const index = state.pieces.findIndex(x => x.id === id);
          if (index === -1) return state;
          const copy: PieceDefinition = { ...state.pieces[index], id: nanoid(), color: getPieceColor(state.pieces.length) };
          const pieces = [...state.pieces];
          pieces.splice(index + 1, 0, copy);
          return { pieces };
        });
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
      toggleDarkMode: () => set(state => {
        const darkMode = !state.darkMode;
        persistDarkMode(darkMode);
        return { darkMode };
      }),
      setLanguage: (language) => {
        set({ language });
        persistLanguage(language);
      },

      saveProject: () => {
        if (!saveProjectToLibrary(get().exportProject())) {
          alert((TRANSLATIONS[get().language] ?? TRANSLATIONS.en).saveFailed);
          return;
        }
        set({ hasUnsavedChanges: false });
      },
      loadProject: (project) => {
        set({
          projectId: project.id,
          projectName: project.name,
          projectCreatedAt: project.createdAt,
          unit: project.unit,
          algorithm: project.algorithm,
          settings: project.settings,
          materials: project.materials,
          pieces: project.pieces,
          offcutStock: project.offcutStock,
        });
        // Undo/redo history belongs to the project being edited — carrying it
        // across a switch would let Cmd+Z revert into a *different* project's data.
        useStore.temporal.getState().clear();
        // Must come after the set()/clear() above: both push/pop temporal
        // history, which the hasUnsavedChanges subscriber reacts to — setting
        // it last makes sure it isn't immediately flipped back to true.
        set({ hasUnsavedChanges: false });
        get().recomputeLayout();
      },
      exportProject: (): Project => {
        const s = get();
        return {
          id: s.projectId,
          name: s.projectName,
          createdAt: s.projectCreatedAt,
          updatedAt: Date.now(),
          settings: s.settings,
          materials: s.materials,
          unit: s.unit,
          algorithm: s.algorithm,
          pieces: s.pieces,
          offcutStock: s.offcutStock,
        };
      },

      newProject: () => {
        const language = get().language;
        set({ ...blankProject(language, TRANSLATIONS[language]?.newProjectDefaultName), layout: null, selectedPieceId: null, hoveredPieceId: null });
        useStore.temporal.getState().clear();
        set({ hasUnsavedChanges: false });
        get().recomputeLayout();
      },
      duplicateProject: () => {
        const project = get().exportProject();
        const t = TRANSLATIONS[get().language] ?? TRANSLATIONS.en;
        const copy: Project = { ...project, id: nanoid(), name: t.duplicateSuffix(project.name), createdAt: Date.now(), updatedAt: Date.now() };
        if (!saveProjectToLibrary(copy)) {
          alert((TRANSLATIONS[get().language] ?? TRANSLATIONS.en).duplicateSaveFailed);
          return;
        }
        get().loadProject(copy);
      },
      loadProjectById: (id) => {
        const project = loadProjectFromLibrary(id);
        if (!project) return;
        setActiveProjectId(id);
        get().loadProject(project);
      },
      deleteProjectById: (id) => {
        deleteProjectFromLibrary(id);
        if (get().projectId === id) get().newProject();
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
      // Without this, every set() call — including ones that only touch
      // untracked fields like layout, selectedPieceId, or hoveredPieceId (so
      // on every hover!) — pushes a new history entry, since zundo otherwise
      // records unconditionally. All tracked fields are only ever replaced
      // with new references when they actually change, so a shallow compare
      // is enough to skip no-op pushes.
      equality: shallow,
      // Caps memory growth over a long editing session; oldest entries drop
      // off the front once exceeded.
      limit: 100,
    }
  )
);

// Resume the most recently active project on startup, migrating the old
// single-project save into the library the first time this code runs.
migrateLegacySingleProject();
const activeId = getActiveProjectId();
if (activeId) {
  const project = loadProjectFromLibrary(activeId);
  if (project) useStore.getState().loadProject(project);
}

// Any genuine edit to tracked project data (pieces, materials, settings,
// algorithm, projectName) pushes a new undo-history entry — piggyback on
// that to flag unsaved changes, since saving is manual (no autosave) and
// there's otherwise nothing warning the user before they navigate away.
useStore.temporal.subscribe((state, prevState) => {
  if (state.pastStates.length !== prevState.pastStates.length) {
    useStore.setState({ hasUnsavedChanges: true });
  }
});
