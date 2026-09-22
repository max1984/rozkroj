// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProjectLibrary } from './ProjectLibrary';
import type { LibraryEntry } from '../../utils/projectLibrary';

const newProject = vi.fn();
const duplicateProject = vi.fn();
const loadProjectById = vi.fn();
const deleteProjectById = vi.fn();
const saveProject = vi.fn();
let projectId = 'active-id';

vi.mock('../../store', () => ({
  useStore: (selector: (s: {
    projectId: string; newProject: typeof newProject; duplicateProject: typeof duplicateProject;
    loadProjectById: typeof loadProjectById; deleteProjectById: typeof deleteProjectById; saveProject: typeof saveProject;
  }) => unknown) => selector({ projectId, newProject, duplicateProject, loadProjectById, deleteProjectById, saveProject }),
}));

let entries: LibraryEntry[] = [];
const listProjects = vi.fn(() => entries);

vi.mock('../../utils/projectLibrary', () => ({
  listProjects: () => listProjects(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  entries = [];
  projectId = 'active-id';
});

describe('ProjectLibrary', () => {
  it('shows an empty-state message when there are no saved projects', () => {
    render(<ProjectLibrary />);
    fireEvent.click(screen.getByTitle('Project library'));
    expect(screen.getByText(/No saved projects yet/)).toBeTruthy();
  });

  it('lists saved projects and marks the active one as current', () => {
    entries = [
      { id: 'active-id', name: 'Kitchen', updatedAt: Date.now() },
      { id: 'other-id', name: 'Bathroom', updatedAt: Date.now() },
    ];
    render(<ProjectLibrary />);
    fireEvent.click(screen.getByTitle('Project library'));

    expect(screen.getByText('Bathroom')).toBeTruthy();
    expect(screen.getAllByText(/current/).length).toBeGreaterThan(0);
  });

  it('loads a project and closes the dialog when clicking its entry', () => {
    entries = [{ id: 'other-id', name: 'Bathroom', updatedAt: Date.now() }];
    render(<ProjectLibrary />);
    fireEvent.click(screen.getByTitle('Project library'));

    fireEvent.click(screen.getByText('Bathroom'));

    expect(loadProjectById).toHaveBeenCalledWith('other-id');
    expect(screen.queryByText('Bathroom')).toBeNull();
  });

  it('deletes a project without loading it', () => {
    entries = [{ id: 'other-id', name: 'Bathroom', updatedAt: Date.now() }];
    render(<ProjectLibrary />);
    fireEvent.click(screen.getByTitle('Project library'));

    fireEvent.click(screen.getByTitle('Delete project'));

    expect(deleteProjectById).toHaveBeenCalledWith('other-id');
    expect(loadProjectById).not.toHaveBeenCalled();
  });

  it('creates a new project and closes the dialog', () => {
    render(<ProjectLibrary />);
    fireEvent.click(screen.getByTitle('Project library'));

    fireEvent.click(screen.getByText('New'));

    expect(newProject).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Projects')).toBeNull();
  });

  it('saves the current project and keeps the dialog open', () => {
    render(<ProjectLibrary />);
    fireEvent.click(screen.getByTitle('Project library'));

    fireEvent.click(screen.getByText('Save current'));

    expect(saveProject).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Projects')).toBeTruthy();
  });

  it('duplicates the current project', () => {
    render(<ProjectLibrary />);
    fireEvent.click(screen.getByTitle('Project library'));

    fireEvent.click(screen.getByText('Duplicate'));

    expect(duplicateProject).toHaveBeenCalledTimes(1);
  });
});
