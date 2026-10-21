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
  clearActiveProjectId,
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

  // newProject/duplicateProject/loadProjectById all replace in-memory state
  // outright, with no autosave — each returns false (without doing anything)
  // instead of true if the user has unsaved changes and cancels the discard
  // confirmation, so callers can skip whatever UI step (closing a dialog,
  // refreshing a list) only makes sense once the switch actually happened.
  // No skipConfirm escape hatch here on purpose: deleteProjectById's cascade
  // (which legitimately needs to skip it — see there) resets project state
  // directly through the private resetProject() helper instead, so this
  // public action can't be called from a component to silently bypass the
  // confirmation.
  newProject: () => boolean;
  duplicateProject: () => boolean;
  loadProjectById: (id: string) => boolean;
  deleteProjectById: (id: string) => void;

  // Exposed so call sites that replace in-memory project state outside of
  // the three actions above (e.g. useSaveLoad's loadFromFile, loading from
  // an exported file) can reuse the exact same check and wording instead of
  // hand-rolling their own copy that can silently drift from it.
  confirmDiscardUnsaved: (message?: string) => boolean;

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

type UndoTrackedFields = Pick<AppState, 'pieces' | 'materials' | 'settings' | 'algorithm' | 'projectName' | 'offcutStock'>;

// Same field selection as the temporal `partialize` option below (kept as
// one function so the two can never drift apart).
//
// offcutStock is itself part of the saved project (exportProject/loadProject
// round-trip it), but was missing here — addOffcut/removeOffcut ("Save
// offcuts", the trash icon) never flipped hasUnsavedChanges, so a session
// that only touched offcuts (a very normal flow: reopen an already-saved
// project, run the optimizer, "Save offcuts", then start a new project)
// got no "discard unsaved changes?" warning and silently lost that offcut
// data — and wasn't undoable either, since this same list drives zundo's
// partialize below.
function undoTrackedFields(state: AppState): UndoTrackedFields {
  return {
    pieces: state.pieces,
    materials: state.materials,
    settings: state.settings,
    algorithm: state.algorithm,
    projectName: state.projectName,
    offcutStock: state.offcutStock,
  };
}

// Shared by newProject/duplicateProject/loadProjectById — each replaces the
// whole in-memory project outright, with no autosave, so each needs this
// same check before proceeding. Centralized here instead of (as before) at
// every UI call site, so a future caller can't forget to add it. `message`
// lets duplicateProject use its own wording — unlike New/Load, it doesn't
// actually lose the edits (they end up in the new duplicate); it's the
// ORIGINAL project's own saved copy that's left without them, which the
// default "will be lost" message would misstate.
function confirmDiscardUnsaved(get: () => AppState, message?: string): boolean {
  if (!get().hasUnsavedChanges) return true;
  // `message` is already the full string when provided (duplicateProject) —
  // the TRANSLATIONS lookup only needs to happen in the fallback case, so it
  // sits behind the `??` short-circuit instead of running unconditionally.
  return confirm(message ?? (TRANSLATIONS[get().language] ?? TRANSLATIONS.en).unsavedChangesConfirm);
}

// Resets in-memory project state to a blank project, with NO confirmation
// check — callers are responsible for confirming first (newProject) or for
// being a context where confirming again would be redundant
// (deleteProjectById's cascade). Deliberately not exposed on AppState: the
// only way to skip the confirmation is to go through deleteProjectById's own
// "are you sure you want to delete this?" prompt, not a public option that
// any future component could pass without the user ever being asked.
function resetProject(set: (partial: Partial<AppState>) => void, get: () => AppState): void {
  const language = get().language;
  set({ ...blankProject(language, (TRANSLATIONS[language] ?? TRANSLATIONS.en).newProjectDefaultName), layout: null, selectedPieceId: null, hoveredPieceId: null });
  useStore.temporal.getState().clear();
  savedSnapshot = undoTrackedFields(get());
  set({ hasUnsavedChanges: false });
  get().recomputeLayout();
}

// Snapshot of the tracked fields at the moment of the last save/load/new-
// project — the hasUnsavedChanges subscriber below shallow-compares the
// CURRENT tracked fields against this anchor instead of reacting to any
// pastStates.length change. Reacting to length deltas (the previous
// approach) broke two ways: (1) it couldn't tell Undo apart from a genuine
// edit — undoing back to exactly the saved snapshot decreases
// pastStates.length too, so it incorrectly re-flagged the project as dirty
// right after the user had undone their way back to a state identical to
// what's on disk; (2) once zundo's `limit: 100` below starts evicting the
// oldest entry, pastStates.length saturates at 100 and stops changing even
// as further edits happen, silently breaking dirty-detection altogether.
// Comparing actual field references (all tracked fields are always replaced
// wholesale, never mutated — see e.g. `pieces: [...state.pieces, ...]`
// throughout this file) sidesteps both: it only cares whether the live data
// matches what was saved, never how it got there or how deep the stack is.
let savedSnapshot: UndoTrackedFields | null = null;

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
        savedSnapshot = undoTrackedFields(get());
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
        savedSnapshot = undoTrackedFields(get());
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
        if (!confirmDiscardUnsaved(get)) return false;
        resetProject(set, get);
        return true;
      },
      duplicateProject: () => {
        const t = TRANSLATIONS[get().language] ?? TRANSLATIONS.en;
        if (!confirmDiscardUnsaved(get, t.duplicateUnsavedChangesConfirm)) return false;
        const project = get().exportProject();
        const copy: Project = { ...project, id: nanoid(), name: t.duplicateSuffix(project.name), createdAt: Date.now(), updatedAt: Date.now() };
        if (!saveProjectToLibrary(copy)) {
          alert(t.duplicateSaveFailed);
          return false;
        }
        get().loadProject(copy);
        return true;
      },
      loadProjectById: (id) => {
        if (!confirmDiscardUnsaved(get)) return false;
        const project = loadProjectFromLibrary(id);
        if (!project) return false;
        setActiveProjectId(id);
        get().loadProject(project);
        return true;
      },
      deleteProjectById: (id) => {
        deleteProjectFromLibrary(id);
        if (get().projectId === id) {
          // Otherwise the persisted active-project pointer keeps naming a
          // project that no longer exists in the library. Goes through
          // resetProject() directly rather than newProject(): deleting the
          // active project already asked its own "are you sure?" (see
          // ProjectLibrary.tsx), and whatever was unsaved on it is moot once
          // it's gone, so it must not ask again here.
          clearActiveProjectId();
          resetProject(set, get);
        }
      },
      confirmDiscardUnsaved: (message) => confirmDiscardUnsaved(get, message),

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
      partialize: undoTrackedFields,
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

// Baseline anchor for a freshly created store (no explicit save/load yet) —
// the blank project just spread into initial state above counts as "saved"
// until the user actually edits it.
savedSnapshot = undoTrackedFields(useStore.getState());

// Resume the most recently active project on startup, migrating the old
// single-project save into the library the first time this code runs.
migrateLegacySingleProject();
const activeId = getActiveProjectId();
if (activeId) {
  const project = loadProjectFromLibrary(activeId);
  if (project) useStore.getState().loadProject(project);
}

// Any genuine edit to tracked project data (pieces, materials, settings,
// algorithm, projectName) pushes/pops a temporal entry — piggyback on that
// to recompute unsaved changes, since saving is manual (no autosave) and
// there's otherwise nothing warning the user before they navigate away.
// Shallow-compared against savedSnapshot (not reacting to the push/pop
// itself) so that Undo/Redo landing back exactly on the saved snapshot
// correctly clears the flag instead of only ever setting it — see the
// comment on savedSnapshot above for why a pastStates.length check is wrong.
useStore.temporal.subscribe(() => {
  const dirty = savedSnapshot !== null && !shallow(undoTrackedFields(useStore.getState()), savedSnapshot);
  if (dirty !== useStore.getState().hasUnsavedChanges) {
    useStore.setState({ hasUnsavedChanges: dirty });
  }
});
