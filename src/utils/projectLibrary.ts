import type { Project } from '../types';
import { migrateProject } from './migrateProject';

const INDEX_KEY = 'rozkroj_library_index';
const ACTIVE_ID_KEY = 'rozkroj_active_project_id';
const LEGACY_SINGLE_KEY = 'rozkroj_project';
const PROJECT_KEY_PREFIX = 'rozkroj_library_project_';
const projectKey = (id: string) => `${PROJECT_KEY_PREFIX}${id}`;

export interface LibraryEntry {
  id: string;
  name: string;
  updatedAt: number;
}

function readIndex(): LibraryEntry[] {
  const raw = localStorage.getItem(INDEX_KEY);
  if (raw === null) return [];
  try {
    return JSON.parse(raw);
  } catch {
    // The index is corrupt (as opposed to simply not existing yet). Every
    // project is stored independently under its own projectKey(id), so
    // nothing is actually lost — but returning [] here would make the next
    // saveProjectToLibrary() overwrite INDEX_KEY with just that one project,
    // permanently orphaning every other still-intact project (same class of
    // silent-data-loss bug as czytajka's LibraryStore). Rebuild the index
    // from the individually-keyed projects instead of discarding them.
    return rebuildIndexFromStoredProjects();
  }
}

function rebuildIndexFromStoredProjects(): LibraryEntry[] {
  const entries: LibraryEntry[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PROJECT_KEY_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const project = migrateProject(JSON.parse(raw));
      entries.push({ id: project.id, name: project.name, updatedAt: project.updatedAt });
    } catch { /* skip an individually-corrupt project, keep the rest */ }
  }
  return entries;
}

function writeIndex(entries: LibraryEntry[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
}

export function listProjects(): LibraryEntry[] {
  return readIndex().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getActiveProjectId(): string | null {
  return localStorage.getItem(ACTIVE_ID_KEY);
}

export function setActiveProjectId(id: string): void {
  localStorage.setItem(ACTIVE_ID_KEY, id);
}

export function clearActiveProjectId(): void {
  localStorage.removeItem(ACTIVE_ID_KEY);
}

export function loadProjectFromLibrary(id: string): Project | null {
  try {
    const raw = localStorage.getItem(projectKey(id));
    return raw ? migrateProject(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Returns false (instead of throwing) if localStorage write fails, e.g. quota exceeded or unavailable. */
export function saveProjectToLibrary(project: Project): boolean {
  const key = projectKey(project.id);
  let previousRaw: string | null = null;
  let projectWritten = false;
  try {
    // Captured before writing (inside the same try — a storage that can't
    // even be read from should fail this call the same as one that can't be
    // written to, rather than throwing out of this "never throws" function),
    // so a failure further down (e.g. the index write hitting quota right
    // after the project write succeeded) can be rolled back.
    previousRaw = localStorage.getItem(key);
    localStorage.setItem(key, JSON.stringify(project));
    projectWritten = true;
    const entries = readIndex().filter(e => e.id !== project.id);
    entries.push({ id: project.id, name: project.name, updatedAt: project.updatedAt });
    writeIndex(entries);
    setActiveProjectId(project.id);
    return true;
  } catch {
    // Without this, a failure here (typically the index write going over
    // quota right after the project write itself succeeded) would leave
    // behind either: a brand-new project's data under its own key with no
    // index entry pointing at it — invisible in the UI, unreachable via
    // deleteProjectFromLibrary, permanently wasting quota — or, on an
    // update, the OLD project overwritten with the NEW content while the
    // index still shows the project's previous name/updatedAt. Restore
    // whatever was there before this call so a reported failure actually
    // leaves nothing changed. Only attempted when the project write itself
    // actually went through — otherwise there is nothing to roll back, and
    // this stays a no-op exactly like before. This can't throw further:
    // removing a key never hits quota, and re-writing the previous value
    // returns storage to the size it was at before this call started.
    if (projectWritten) {
      try {
        if (previousRaw === null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, previousRaw);
        }
      } catch { /* best effort rollback; nothing more we can do */ }
    }
    return false;
  }
}

export function deleteProjectFromLibrary(id: string): void {
  localStorage.removeItem(projectKey(id));
  writeIndex(readIndex().filter(e => e.id !== id));
}

/** One-time move of the pre-library single-project save into the library. */
export function migrateLegacySingleProject(): void {
  if (readIndex().length > 0) return;
  const raw = localStorage.getItem(LEGACY_SINGLE_KEY);
  if (!raw) return;
  try {
    const project = migrateProject(JSON.parse(raw));
    // Only remove the legacy save once the migrated copy is actually
    // persisted — saveProjectToLibrary() returns false (rather than
    // throwing) on a localStorage write failure such as quota exceeded,
    // and removing the legacy key regardless would permanently lose the
    // user's only saved project with nothing successfully migrated.
    if (saveProjectToLibrary(project)) {
      localStorage.removeItem(LEGACY_SINGLE_KEY);
    }
  } catch { /* ignore corrupt legacy save */ }
}
