import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '../utils/testMemoryStorage';
import type { useStore as UseStoreType } from './index';

// store/index.ts runs module-level side effects on import (resuming the last
// active project from localStorage), so localStorage must be stubbed and the
// module re-imported fresh for every test to get an isolated, blank store.
async function freshStore(): Promise<typeof UseStoreType> {
  vi.resetModules();
  vi.stubGlobal('localStorage', new MemoryStorage());
  // getInitialLanguage() falls back to navigator.language when nothing is
  // stored; without this stub these tests would pick up the OS locale of
  // whatever machine runs them (e.g. 'pl-PL'), making default-language
  // assertions pass or fail depending on where the suite runs.
  vi.stubGlobal('navigator', { language: 'en-US' });
  // jsdom doesn't implement window.confirm at all (ReferenceError, not just
  // a no-op) — newProject/duplicateProject/loadProjectById all call it when
  // there are unsaved changes. Defaulting to "confirmed" here matches this
  // suite's pre-existing behavior (most tests don't care about the discard
  // prompt and just want the action to proceed); tests that DO care stub
  // their own 'confirm' afterward, which overrides this default.
  vi.stubGlobal('confirm', () => true);
  const mod = await import('./index');
  return mod.useStore;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('store: undo history noise', () => {
  it('does not push a history entry for actions that only touch untracked fields', async () => {
    const useStore = await freshStore();
    useStore.getState().setHoveredPieceId('some-id');
    useStore.getState().setSelectedPieceId('some-id');
    useStore.getState().toggleDarkMode();
    useStore.getState().recomputeLayout();

    expect(useStore.temporal.getState().pastStates).toEqual([]);
  });

  it('pushes exactly one history entry for a single tracked-field action, not one per set() call', async () => {
    const useStore = await freshStore();
    const materialId = useStore.getState().materials[0].id;

    useStore.getState().addPiece({
      name: 'Shelf', materialId, width: 400, height: 300, quantity: 1,
      grain: 'none', rotationAllowed: true, priority: false,
      edgeBanding: { top: false, right: false, bottom: false, left: false },
    });

    // addPiece's own set({pieces}) call is the only real change; the
    // recomputeLayout() that follows only touches `layout`, which isn't
    // partialized, so it must not push a second, spurious entry.
    expect(useStore.temporal.getState().pastStates).toHaveLength(1);
  });

  it('caps history at 100 entries, dropping the oldest first', async () => {
    const useStore = await freshStore();
    const materialId = useStore.getState().materials[0].id;
    for (let i = 0; i < 105; i++) {
      useStore.getState().addPiece({
        name: `Piece ${i}`, materialId, width: 100, height: 100, quantity: 1,
        grain: 'none', rotationAllowed: true, priority: false,
        edgeBanding: { top: false, right: false, bottom: false, left: false },
      });
    }

    expect(useStore.temporal.getState().pastStates).toHaveLength(100);
  });
});

describe('store: pieces', () => {
  it('addPiece assigns an id and color, and recomputes the layout', async () => {
    const useStore = await freshStore();
    const materialId = useStore.getState().materials[0].id;

    useStore.getState().addPiece({
      name: 'Shelf', materialId, width: 400, height: 300, quantity: 1,
      grain: 'none', rotationAllowed: true, priority: false,
      edgeBanding: { top: false, right: false, bottom: false, left: false },
    });

    const { pieces, layout } = useStore.getState();
    expect(pieces).toHaveLength(1);
    expect(pieces[0].id).toBeTruthy();
    expect(pieces[0].color).toBeTruthy();
    expect(layout?.sheets).toHaveLength(1);
    expect(layout?.sheets[0].placedPieces).toHaveLength(1);
  });

  it('removePiece removes the piece and recomputes the layout', async () => {
    const useStore = await freshStore();
    const materialId = useStore.getState().materials[0].id;
    useStore.getState().addPiece({
      name: 'Shelf', materialId, width: 400, height: 300, quantity: 1,
      grain: 'none', rotationAllowed: true, priority: false,
      edgeBanding: { top: false, right: false, bottom: false, left: false },
    });
    const id = useStore.getState().pieces[0].id;

    useStore.getState().removePiece(id);

    expect(useStore.getState().pieces).toEqual([]);
    expect(useStore.getState().layout?.sheets).toEqual([]);
  });

  it('duplicatePiece inserts a copy with a new id and color right after the original', async () => {
    const useStore = await freshStore();
    const materialId = useStore.getState().materials[0].id;
    useStore.getState().addPiece({
      name: 'Shelf', materialId, width: 400, height: 300, quantity: 2,
      grain: 'horizontal', rotationAllowed: true, priority: true,
      edgeBanding: { top: true, right: false, bottom: false, left: false },
    });
    useStore.getState().addPiece({
      name: 'Door', materialId, width: 500, height: 200, quantity: 1,
      grain: 'none', rotationAllowed: true, priority: false,
      edgeBanding: { top: false, right: false, bottom: false, left: false },
    });
    const original = useStore.getState().pieces[0];

    useStore.getState().duplicatePiece(original.id);

    const { pieces } = useStore.getState();
    expect(pieces).toHaveLength(3);
    expect(pieces[1].id).not.toBe(original.id);
    expect(pieces[1]).toMatchObject({
      name: 'Shelf', width: 400, height: 300, quantity: 2,
      grain: 'horizontal', priority: true, materialId,
    });
    expect(pieces[2].name).toBe('Door');
  });

  it('duplicatePiece does nothing when the id does not match any piece', async () => {
    const useStore = await freshStore();
    const materialId = useStore.getState().materials[0].id;
    useStore.getState().addPiece({
      name: 'Shelf', materialId, width: 400, height: 300, quantity: 1,
      grain: 'none', rotationAllowed: true, priority: false,
      edgeBanding: { top: false, right: false, bottom: false, left: false },
    });

    useStore.getState().duplicatePiece('missing-id');

    expect(useStore.getState().pieces).toHaveLength(1);
  });
});

describe('store: materials', () => {
  it('addMaterial appends a new material with a generated id and color', async () => {
    const useStore = await freshStore();
    useStore.getState().addMaterial({ name: 'MDF', size: { label: 'Custom', width: 1000, height: 500, custom: true }, pricePerSheet: 50 });

    const { materials } = useStore.getState();
    expect(materials).toHaveLength(2);
    expect(materials[1].name).toBe('MDF');
    expect(materials[1].id).not.toBe(materials[0].id);
  });

  it('removeMaterial refuses to remove the last remaining material', async () => {
    const useStore = await freshStore();
    const onlyId = useStore.getState().materials[0].id;

    useStore.getState().removeMaterial(onlyId);

    expect(useStore.getState().materials).toHaveLength(1);
  });

  it('removeMaterial reassigns that material\'s pieces to a fallback material', async () => {
    const useStore = await freshStore();
    const firstId = useStore.getState().materials[0].id;
    useStore.getState().addMaterial({ name: 'MDF', size: { label: 'Custom', width: 1000, height: 500, custom: true }, pricePerSheet: 50 });
    const secondId = useStore.getState().materials[1].id;
    useStore.getState().addPiece({
      name: 'Shelf', materialId: secondId, width: 400, height: 300, quantity: 1,
      grain: 'none', rotationAllowed: true, priority: false,
      edgeBanding: { top: false, right: false, bottom: false, left: false },
    });

    useStore.getState().removeMaterial(secondId);

    expect(useStore.getState().materials.map(m => m.id)).toEqual([firstId]);
    expect(useStore.getState().pieces[0].materialId).toBe(firstId);
  });

  it('removeMaterial purges offcut stock belonging to the removed material, keeping others', async () => {
    const useStore = await freshStore();
    const firstId = useStore.getState().materials[0].id;
    useStore.getState().addMaterial({ name: 'MDF', size: { label: 'Custom', width: 1000, height: 500, custom: true }, pricePerSheet: 50 });
    const secondId = useStore.getState().materials[1].id;
    useStore.getState().addOffcut(firstId, 300, 300);
    useStore.getState().addOffcut(secondId, 200, 200);

    useStore.getState().removeMaterial(secondId);

    const remaining = useStore.getState().offcutStock;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].materialId).toBe(firstId);
  });
});

describe('store: settings', () => {
  it('setSettings merges partial updates and recomputes the layout', async () => {
    const useStore = await freshStore();
    useStore.getState().setSettings({ sawKerf: 5 });
    expect(useStore.getState().settings.sawKerf).toBe(5);
    expect(useStore.getState().settings.freshEdge).toBe(true); // untouched field preserved
  });

  it('setUnit persists the choice so future projects default to it', async () => {
    const useStore = await freshStore();
    useStore.getState().setUnit('inch');
    expect(localStorage.getItem('rozkroj_last_unit')).toBe('inch');
  });

  it('starts a fresh session in the last unit the user chose, not always mm', async () => {
    vi.resetModules();
    const storage = new MemoryStorage();
    storage.setItem('rozkroj_last_unit', 'inch');
    vi.stubGlobal('localStorage', storage);

    const mod = await import('./index');

    expect(mod.useStore.getState().unit).toBe('inch');
  });

  it('setLanguage updates the language and persists the choice', async () => {
    const useStore = await freshStore();
    useStore.getState().setLanguage('pl');
    expect(useStore.getState().language).toBe('pl');
    expect(localStorage.getItem('rozkroj_language')).toBe('pl');
  });

  it('starts a fresh session in the last language the user chose', async () => {
    vi.resetModules();
    const storage = new MemoryStorage();
    storage.setItem('rozkroj_language', 'de');
    vi.stubGlobal('localStorage', storage);

    const mod = await import('./index');

    expect(mod.useStore.getState().language).toBe('de');
  });
});

describe('store: hasUnsavedChanges', () => {
  it('starts false for a fresh project', async () => {
    const useStore = await freshStore();
    expect(useStore.getState().hasUnsavedChanges).toBe(false);
  });

  it('becomes true after a tracked edit', async () => {
    const useStore = await freshStore();
    const materialId = useStore.getState().materials[0].id;
    useStore.getState().addPiece({
      name: 'Shelf', materialId, width: 400, height: 300, quantity: 1,
      grain: 'none', rotationAllowed: true, priority: false,
      edgeBanding: { top: false, right: false, bottom: false, left: false },
    });
    expect(useStore.getState().hasUnsavedChanges).toBe(true);
  });

  it('does not become true from untracked-only changes like hovering', async () => {
    const useStore = await freshStore();
    useStore.getState().setHoveredPieceId('some-id');
    useStore.getState().toggleDarkMode();
    expect(useStore.getState().hasUnsavedChanges).toBe(false);
  });

  it('resets to false after saveProject', async () => {
    const useStore = await freshStore();
    const materialId = useStore.getState().materials[0].id;
    useStore.getState().addPiece({
      name: 'Shelf', materialId, width: 400, height: 300, quantity: 1,
      grain: 'none', rotationAllowed: true, priority: false,
      edgeBanding: { top: false, right: false, bottom: false, left: false },
    });
    useStore.getState().saveProject();
    expect(useStore.getState().hasUnsavedChanges).toBe(false);
  });

  it('resets to false after newProject', async () => {
    const useStore = await freshStore();
    const materialId = useStore.getState().materials[0].id;
    useStore.getState().addPiece({
      name: 'Shelf', materialId, width: 400, height: 300, quantity: 1,
      grain: 'none', rotationAllowed: true, priority: false,
      edgeBanding: { top: false, right: false, bottom: false, left: false },
    });
    useStore.getState().newProject();
    expect(useStore.getState().hasUnsavedChanges).toBe(false);
  });

  it(
    'regression: becomes false again after undoing back to exactly the saved snapshot — previously the ' +
      'subscriber flagged hasUnsavedChanges=true on ANY pastStates.length change, including the decrease from ' +
      'Undo, so undoing a single edit right back to the saved state incorrectly left the project "dirty"',
    async () => {
      const useStore = await freshStore();
      const materialId = useStore.getState().materials[0].id;
      useStore.getState().saveProject();
      expect(useStore.getState().hasUnsavedChanges).toBe(false);

      useStore.getState().addPiece({
        name: 'Shelf', materialId, width: 400, height: 300, quantity: 1,
        grain: 'none', rotationAllowed: true, priority: false,
        edgeBanding: { top: false, right: false, bottom: false, left: false },
      });
      expect(useStore.getState().hasUnsavedChanges).toBe(true);

      useStore.temporal.getState().undo();
      expect(useStore.getState().pieces).toHaveLength(0);
      expect(useStore.getState().hasUnsavedChanges).toBe(false);
    }
  );

  it('redoing past the saved snapshot becomes true again', async () => {
    const useStore = await freshStore();
    const materialId = useStore.getState().materials[0].id;
    useStore.getState().saveProject();

    useStore.getState().addPiece({
      name: 'Shelf', materialId, width: 400, height: 300, quantity: 1,
      grain: 'none', rotationAllowed: true, priority: false,
      edgeBanding: { top: false, right: false, bottom: false, left: false },
    });
    useStore.temporal.getState().undo();
    expect(useStore.getState().hasUnsavedChanges).toBe(false);

    useStore.temporal.getState().redo();
    expect(useStore.getState().pieces).toHaveLength(1);
    expect(useStore.getState().hasUnsavedChanges).toBe(true);
  });

  it(
    'regression: still detects a new edit after history has saturated the 100-entry cap — a length-based ' +
      'dirty check broke here because pastStates.length stops changing once zundo starts evicting the oldest ' +
      'entry on every further push, even though the live data keeps changing',
    async () => {
      const useStore = await freshStore();
      const materialId = useStore.getState().materials[0].id;
      for (let i = 0; i < 100; i++) {
        useStore.getState().addPiece({
          name: `Piece ${i}`, materialId, width: 100, height: 100, quantity: 1,
          grain: 'none', rotationAllowed: true, priority: false,
          edgeBanding: { top: false, right: false, bottom: false, left: false },
        });
      }
      expect(useStore.temporal.getState().pastStates).toHaveLength(100);

      useStore.getState().saveProject();
      expect(useStore.getState().hasUnsavedChanges).toBe(false);

      useStore.getState().addPiece({
        name: 'One more', materialId, width: 50, height: 50, quantity: 1,
        grain: 'none', rotationAllowed: true, priority: false,
        edgeBanding: { top: false, right: false, bottom: false, left: false },
      });
      // Still capped at 100 (oldest entry evicted) — length alone can't tell
      // this apart from "nothing changed".
      expect(useStore.temporal.getState().pastStates).toHaveLength(100);
      expect(useStore.getState().hasUnsavedChanges).toBe(true);
    }
  );

  it('undoing only partway back to a two-edit history stays dirty (not yet back at the saved snapshot)', async () => {
    const useStore = await freshStore();
    const materialId = useStore.getState().materials[0].id;
    useStore.getState().saveProject();

    useStore.getState().addPiece({
      name: 'Shelf', materialId, width: 400, height: 300, quantity: 1,
      grain: 'none', rotationAllowed: true, priority: false,
      edgeBanding: { top: false, right: false, bottom: false, left: false },
    });
    useStore.getState().addPiece({
      name: 'Door', materialId, width: 200, height: 200, quantity: 1,
      grain: 'none', rotationAllowed: true, priority: false,
      edgeBanding: { top: false, right: false, bottom: false, left: false },
    });
    useStore.temporal.getState().undo();
    expect(useStore.getState().pieces).toHaveLength(1);
    expect(useStore.getState().hasUnsavedChanges).toBe(true);
  });
});

describe('store: project lifecycle', () => {
  it('newProject resets to a blank project with a fresh id', async () => {
    const useStore = await freshStore();
    const originalId = useStore.getState().projectId;
    const materialId = useStore.getState().materials[0].id;
    useStore.getState().addPiece({
      name: 'Shelf', materialId, width: 400, height: 300, quantity: 1,
      grain: 'none', rotationAllowed: true, priority: false,
      edgeBanding: { top: false, right: false, bottom: false, left: false },
    });

    useStore.getState().newProject();

    const state = useStore.getState();
    expect(state.projectId).not.toBe(originalId);
    expect(state.pieces).toEqual([]);
    expect(state.projectName).toBe('New Project');
  });

  it('saveProject then loadProjectById round-trips the project', async () => {
    const useStore = await freshStore();
    useStore.getState().setProjectName('My Cabinets');
    useStore.getState().saveProject();
    const id = useStore.getState().projectId;

    useStore.getState().newProject();
    expect(useStore.getState().projectName).not.toBe('My Cabinets');

    useStore.getState().loadProjectById(id);

    expect(useStore.getState().projectId).toBe(id);
    expect(useStore.getState().projectName).toBe('My Cabinets');
  });

  it('alerts and keeps hasUnsavedChanges true when the save fails (e.g. storage quota)', async () => {
    const useStore = await freshStore();
    const materialId = useStore.getState().materials[0].id;
    useStore.getState().addPiece({
      name: 'Shelf', materialId, width: 400, height: 300, quantity: 1,
      grain: 'none', rotationAllowed: true, priority: false,
      edgeBanding: { top: false, right: false, bottom: false, left: false },
    });
    const alertSpy = vi.fn();
    vi.stubGlobal('alert', alertSpy);
    vi.stubGlobal('localStorage', { ...localStorage, setItem: () => { throw new Error('quota'); } });

    useStore.getState().saveProject();

    expect(alertSpy).toHaveBeenCalled();
    expect(useStore.getState().hasUnsavedChanges).toBe(true);
  });

  it('duplicateProject saves a copy under a new id and switches to it', async () => {
    const useStore = await freshStore();
    useStore.getState().setProjectName('Original');
    const originalId = useStore.getState().projectId;

    useStore.getState().duplicateProject();

    const state = useStore.getState();
    expect(state.projectId).not.toBe(originalId);
    expect(state.projectName).toBe('Original (copy)');
  });

  // newProject/duplicateProject/loadProjectById each replace the whole
  // in-memory project outright, with no autosave — this used to be guarded
  // at each UI call site (ProjectLibrary.tsx) individually, which meant a
  // future caller could forget to add the same check. Moved here, into the
  // actions themselves, so it can't be skipped — except by deliberately
  // passing skipConfirm (see deleteProjectById's own cascade test below).
  describe('discard-unsaved-changes confirmation', () => {
    it('newProject returns false and leaves the project untouched when the user cancels the confirmation', async () => {
      const useStore = await freshStore();
      addTestPiece(useStore, 'Shelf');
      const confirmSpy = vi.fn(() => false);
      vi.stubGlobal('confirm', confirmSpy);

      const result = useStore.getState().newProject();

      expect(result).toBe(false);
      expect(confirmSpy).toHaveBeenCalled();
      expect(useStore.getState().pieces).toHaveLength(1);
    });

    it('newProject proceeds and returns true when the user confirms', async () => {
      const useStore = await freshStore();
      addTestPiece(useStore, 'Shelf');
      vi.stubGlobal('confirm', vi.fn(() => true));

      const result = useStore.getState().newProject();

      expect(result).toBe(true);
      expect(useStore.getState().pieces).toHaveLength(0);
    });

    it('newProject does not ask for confirmation when there are no unsaved changes', async () => {
      const useStore = await freshStore();
      const confirmSpy = vi.fn();
      vi.stubGlobal('confirm', confirmSpy);

      const result = useStore.getState().newProject();

      expect(result).toBe(true);
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('duplicateProject returns false and creates no copy when the user cancels the confirmation', async () => {
      const useStore = await freshStore();
      addTestPiece(useStore, 'Shelf');
      const originalId = useStore.getState().projectId;
      vi.stubGlobal('confirm', vi.fn(() => false));

      const result = useStore.getState().duplicateProject();

      expect(result).toBe(false);
      expect(useStore.getState().projectId).toBe(originalId);
    });

    it(
      "duplicateProject's confirmation message is distinct from newProject/loadProjectById's — unlike " +
        "those two, it doesn't actually lose the edits (they end up in the new duplicate); it's the " +
        "ORIGINAL project's own saved copy that's left without them",
      async () => {
        const useStore = await freshStore();
        addTestPiece(useStore, 'Shelf');
        const confirmSpy = vi.fn(() => false);
        vi.stubGlobal('confirm', confirmSpy);

        useStore.getState().duplicateProject();

        expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("won't be saved to this project"));
      }
    );

    it('duplicateProject does not ask for confirmation when there are no unsaved changes', async () => {
      const useStore = await freshStore();
      const confirmSpy = vi.fn();
      vi.stubGlobal('confirm', confirmSpy);

      const result = useStore.getState().duplicateProject();

      expect(result).toBe(true);
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('loadProjectById returns false and leaves the project untouched when the user cancels the confirmation', async () => {
      const useStore = await freshStore();
      useStore.getState().saveProject();
      const savedId = useStore.getState().projectId;
      useStore.getState().newProject();
      addTestPiece(useStore, 'Shelf');
      vi.stubGlobal('confirm', vi.fn(() => false));

      const result = useStore.getState().loadProjectById(savedId);

      expect(result).toBe(false);
      expect(useStore.getState().projectId).not.toBe(savedId);
      expect(useStore.getState().pieces).toHaveLength(1);
    });

    it('loadProjectById does not ask for confirmation when there are no unsaved changes', async () => {
      const useStore = await freshStore();
      useStore.getState().saveProject();
      const savedId = useStore.getState().projectId;
      const confirmSpy = vi.fn();
      vi.stubGlobal('confirm', confirmSpy);

      const result = useStore.getState().loadProjectById(savedId);

      expect(result).toBe(true);
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it(
      "deleteProjectById resetting in-memory state when deleting the active project does not ask for the " +
        'discard-unsaved-changes confirmation a second time — the user already confirmed deletion itself ' +
        '(ProjectLibrary.tsx), and whatever was unsaved on the now-deleted project is moot',
      async () => {
        const useStore = await freshStore();
        useStore.getState().saveProject();
        const activeId = useStore.getState().projectId;
        addTestPiece(useStore, 'Shelf'); // leaves hasUnsavedChanges true
        const confirmSpy = vi.fn(() => false); // would block a non-skipped confirm
        vi.stubGlobal('confirm', confirmSpy);

        useStore.getState().deleteProjectById(activeId);

        expect(confirmSpy).not.toHaveBeenCalled();
        expect(useStore.getState().projectId).not.toBe(activeId);
      }
    );

    it(
      'confirmDiscardUnsaved is exposed directly on the store so callers outside newProject/duplicateProject/' +
        'loadProjectById (e.g. useSaveLoad loading from an exported file) can reuse the same check instead of ' +
        'hand-rolling their own copy',
      async () => {
        const useStore = await freshStore();
        addTestPiece(useStore, 'Shelf');
        const confirmSpy = vi.fn(() => false);
        vi.stubGlobal('confirm', confirmSpy);

        expect(useStore.getState().confirmDiscardUnsaved()).toBe(false);
        expect(confirmSpy).toHaveBeenCalled();
      }
    );
  });

  it('deleteProjectById resets to a new project when deleting the currently active one', async () => {
    const useStore = await freshStore();
    useStore.getState().saveProject();
    const activeId = useStore.getState().projectId;

    useStore.getState().deleteProjectById(activeId);

    expect(useStore.getState().projectId).not.toBe(activeId);
  });

  it('deleteProjectById leaves the current state untouched when deleting a different project', async () => {
    const useStore = await freshStore();
    useStore.getState().setProjectName('Keep me');
    useStore.getState().saveProject();
    const activeId = useStore.getState().projectId;

    useStore.getState().deleteProjectById('some-other-id');

    expect(useStore.getState().projectId).toBe(activeId);
    expect(useStore.getState().projectName).toBe('Keep me');
  });

  it('deleteProjectById clears the persisted active-project pointer when deleting the active one', async () => {
    const useStore = await freshStore();
    const { getActiveProjectId } = await import('../utils/projectLibrary');
    useStore.getState().saveProject();
    const activeId = useStore.getState().projectId;

    useStore.getState().deleteProjectById(activeId);

    // Otherwise a later reload would resume with a pointer to a project
    // that no longer exists in the library.
    expect(getActiveProjectId()).not.toBe(activeId);
  });

  // pastStates holds snapshots to revert *to*, so a piece only shows up in
  // history once a later change has pushed the state that contained it.
  function pastStatesMentionPiece(useStore: typeof UseStoreType, pieceName: string): boolean {
    return useStore.temporal.getState().pastStates.some(
      s => (s as { pieces?: { name: string }[] }).pieces?.some(p => p.name === pieceName)
    );
  }

  function addTestPiece(useStore: typeof UseStoreType, name: string) {
    const materialId = useStore.getState().materials[0].id;
    useStore.getState().addPiece({
      name, materialId, width: 400, height: 300, quantity: 1,
      grain: 'none', rotationAllowed: true, priority: false,
      edgeBanding: { top: false, right: false, bottom: false, left: false },
    });
  }

  it('newProject clears undo/redo history so it cannot revert into the old project', async () => {
    const useStore = await freshStore();
    addTestPiece(useStore, 'Shelf');
    addTestPiece(useStore, 'Cabinet'); // pushes a past state that contains 'Shelf'
    expect(pastStatesMentionPiece(useStore, 'Shelf')).toBe(true);

    useStore.getState().newProject();

    expect(pastStatesMentionPiece(useStore, 'Shelf')).toBe(false);
    expect(useStore.temporal.getState().futureStates).toEqual([]);
  });

  it('loadProject clears undo/redo history so it cannot revert into a different project', async () => {
    const useStore = await freshStore();
    addTestPiece(useStore, 'Shelf');
    addTestPiece(useStore, 'Cabinet'); // pushes a past state that contains 'Shelf'
    expect(pastStatesMentionPiece(useStore, 'Shelf')).toBe(true);
    const otherProject = { ...useStore.getState().exportProject(), id: 'other-id', pieces: [] };

    useStore.getState().loadProject(otherProject);

    expect(pastStatesMentionPiece(useStore, 'Shelf')).toBe(false);
    expect(useStore.temporal.getState().futureStates).toEqual([]);
  });
});
