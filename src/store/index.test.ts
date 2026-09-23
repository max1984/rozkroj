import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '../utils/testMemoryStorage';
import type { useStore as UseStoreType } from './index';

// store/index.ts runs module-level side effects on import (resuming the last
// active project from localStorage), so localStorage must be stubbed and the
// module re-imported fresh for every test to get an isolated, blank store.
async function freshStore(): Promise<typeof UseStoreType> {
  vi.resetModules();
  vi.stubGlobal('localStorage', new MemoryStorage());
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

  it('duplicateProject saves a copy under a new id and switches to it', async () => {
    const useStore = await freshStore();
    useStore.getState().setProjectName('Original');
    const originalId = useStore.getState().projectId;

    useStore.getState().duplicateProject();

    const state = useStore.getState();
    expect(state.projectId).not.toBe(originalId);
    expect(state.projectName).toBe('Original (copy)');
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
