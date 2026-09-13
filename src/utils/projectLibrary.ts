import type { Project } from '../types';
import { migrateProject } from './migrateProject';

const INDEX_KEY = 'rozkroj_library_index';
const ACTIVE_ID_KEY = 'rozkroj_active_project_id';
const LEGACY_SINGLE_KEY = 'rozkroj_project';
const projectKey = (id: string) => `rozkroj_library_project_${id}`;

export interface LibraryEntry {
  id: string;
  name: string;
  updatedAt: number;
}

function readIndex(): LibraryEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
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

export function loadProjectFromLibrary(id: string): Project | null {
  try {
    const raw = localStorage.getItem(projectKey(id));
    return raw ? migrateProject(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveProjectToLibrary(project: Project): void {
  localStorage.setItem(projectKey(project.id), JSON.stringify(project));
  const entries = readIndex().filter(e => e.id !== project.id);
  entries.push({ id: project.id, name: project.name, updatedAt: project.updatedAt });
  writeIndex(entries);
  setActiveProjectId(project.id);
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
    saveProjectToLibrary(project);
    localStorage.removeItem(LEGACY_SINGLE_KEY);
  } catch { /* ignore corrupt legacy save */ }
}
