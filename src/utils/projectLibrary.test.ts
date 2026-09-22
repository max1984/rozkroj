import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteProjectFromLibrary,
  getActiveProjectId,
  listProjects,
  loadProjectFromLibrary,
  migrateLegacySingleProject,
  saveProjectToLibrary,
  setActiveProjectId,
} from './projectLibrary';
import type { Project } from '../types';

// Node's built-in `localStorage` global requires --localstorage-file to actually
// persist anything, so tests get a real in-memory Storage implementation instead.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Kitchen cabinets',
    createdAt: 1000,
    updatedAt: 2000,
    settings: { sawKerf: 3, freshEdge: true, freshEdgeTrim: 10 },
    // A non-standard size, so loadProjectFromLibrary's migrateProject pass (which
    // relinks sizes matching STANDARD_SHEET_SIZES) doesn't alter it in round-trip tests.
    materials: [{ id: 'm1', name: 'Chipboard', color: '#222222', size: { label: 'Custom', width: 1800, height: 900, custom: true }, pricePerSheet: 0 }],
    unit: 'mm',
    algorithm: 'maxrects',
    pieces: [],
    offcutStock: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
});

describe('saveProjectToLibrary / loadProjectFromLibrary', () => {
  it('round-trips a saved project', () => {
    const p = project();
    saveProjectToLibrary(p);
    expect(loadProjectFromLibrary('proj-1')).toEqual(p);
  });

  it('returns null for a project id that was never saved', () => {
    expect(loadProjectFromLibrary('missing')).toBeNull();
  });

  it('marks the saved project as the active project', () => {
    saveProjectToLibrary(project());
    expect(getActiveProjectId()).toBe('proj-1');
  });

  it('overwrites a previously saved project with the same id instead of duplicating it', () => {
    saveProjectToLibrary(project({ name: 'First name' }));
    saveProjectToLibrary(project({ name: 'Renamed' }));
    expect(listProjects()).toHaveLength(1);
    expect(listProjects()[0].name).toBe('Renamed');
  });
});

describe('listProjects', () => {
  it('lists saved projects newest-updated first', () => {
    saveProjectToLibrary(project({ id: 'old', updatedAt: 100 }));
    saveProjectToLibrary(project({ id: 'new', updatedAt: 999 }));
    expect(listProjects().map(e => e.id)).toEqual(['new', 'old']);
  });

  it('returns an empty list when nothing has been saved', () => {
    expect(listProjects()).toEqual([]);
  });
});

describe('deleteProjectFromLibrary', () => {
  it('removes the project from both the index and storage', () => {
    saveProjectToLibrary(project());
    deleteProjectFromLibrary('proj-1');
    expect(listProjects()).toEqual([]);
    expect(loadProjectFromLibrary('proj-1')).toBeNull();
  });

  it('is a no-op for an id that does not exist', () => {
    saveProjectToLibrary(project());
    deleteProjectFromLibrary('does-not-exist');
    expect(listProjects()).toHaveLength(1);
  });
});

describe('setActiveProjectId / getActiveProjectId', () => {
  it('returns null before any project has been made active', () => {
    expect(getActiveProjectId()).toBeNull();
  });

  it('returns the id that was set', () => {
    setActiveProjectId('proj-42');
    expect(getActiveProjectId()).toBe('proj-42');
  });
});

describe('migrateLegacySingleProject', () => {
  it('moves a pre-library single-project save into the library and removes the legacy key', () => {
    localStorage.setItem('rozkroj_project', JSON.stringify(project({ id: 'legacy' })));

    migrateLegacySingleProject();

    expect(listProjects().map(e => e.id)).toEqual(['legacy']);
    expect(localStorage.getItem('rozkroj_project')).toBeNull();
  });

  it('does nothing when the library already has projects', () => {
    saveProjectToLibrary(project({ id: 'existing' }));
    localStorage.setItem('rozkroj_project', JSON.stringify(project({ id: 'legacy' })));

    migrateLegacySingleProject();

    expect(listProjects().map(e => e.id)).toEqual(['existing']);
    // Legacy save is left alone since it was never migrated.
    expect(localStorage.getItem('rozkroj_project')).not.toBeNull();
  });

  it('does nothing when there is no legacy save', () => {
    migrateLegacySingleProject();
    expect(listProjects()).toEqual([]);
  });

  it('ignores a corrupt legacy save instead of throwing', () => {
    localStorage.setItem('rozkroj_project', '{not valid json');
    expect(() => migrateLegacySingleProject()).not.toThrow();
    expect(listProjects()).toEqual([]);
  });
});
