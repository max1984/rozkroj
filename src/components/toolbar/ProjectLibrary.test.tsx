// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProjectLibrary } from './ProjectLibrary';
import type { LibraryEntry } from '../../utils/projectLibrary';

// newProject/duplicateProject/loadProjectById now return a boolean
// themselves (store/index.ts) — false means "the user had unsaved changes
// and cancelled the discard confirmation, nothing happened." The component
// no longer does that check itself; it just has to react correctly to the
// return value, which is what these mocks (and the tests below) exercise.
// The confirm-dialog behavior itself is tested at the store level now
// (store/index.test.ts), not here.
const newProject = vi.fn(() => true);
const duplicateProject = vi.fn(() => true);
const loadProjectById = vi.fn(() => true);
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
  newProject.mockReturnValue(true);
  duplicateProject.mockReturnValue(true);
  loadProjectById.mockReturnValue(true);
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

  it(
    'does not close the dialog when loadProjectById() returns false — e.g. the user had unsaved changes ' +
      'and cancelled the discard confirmation inside the store',
    () => {
      loadProjectById.mockReturnValue(false);
      entries = [{ id: 'other-id', name: 'Bathroom', updatedAt: Date.now() }];
      render(<ProjectLibrary />);
      fireEvent.click(screen.getByTitle('Project library'));

      fireEvent.click(screen.getByText('Bathroom'));

      expect(loadProjectById).toHaveBeenCalledWith('other-id');
      expect(screen.getByText('Bathroom')).toBeTruthy();
    }
  );

  it('deletes a project without loading it, after the user confirms', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    entries = [{ id: 'other-id', name: 'Bathroom', updatedAt: Date.now() }];
    render(<ProjectLibrary />);
    fireEvent.click(screen.getByTitle('Project library'));

    fireEvent.click(screen.getByTitle('Delete project'));

    expect(confirmSpy).toHaveBeenCalledWith('Delete "Bathroom"? This cannot be undone.');
    expect(deleteProjectById).toHaveBeenCalledWith('other-id');
    expect(loadProjectById).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('does not delete a project when the user cancels the confirmation', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    entries = [{ id: 'other-id', name: 'Bathroom', updatedAt: Date.now() }];
    render(<ProjectLibrary />);
    fireEvent.click(screen.getByTitle('Project library'));

    fireEvent.click(screen.getByTitle('Delete project'));

    expect(deleteProjectById).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('creates a new project and closes the dialog', () => {
    render(<ProjectLibrary />);
    fireEvent.click(screen.getByTitle('Project library'));

    fireEvent.click(screen.getByText('New'));

    expect(newProject).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Projects')).toBeNull();
  });

  it(
    'keeps the dialog open and does not refresh when newProject() returns false — e.g. the user had ' +
      'unsaved changes and cancelled the discard confirmation inside the store',
    () => {
      newProject.mockReturnValue(false);
      render(<ProjectLibrary />);
      fireEvent.click(screen.getByTitle('Project library'));

      fireEvent.click(screen.getByText('New'));

      expect(newProject).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Projects')).toBeTruthy();
    }
  );

  it('saves the current project and keeps the dialog open', () => {
    render(<ProjectLibrary />);
    fireEvent.click(screen.getByTitle('Project library'));

    fireEvent.click(screen.getByText('Save current'));

    expect(saveProject).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Projects')).toBeTruthy();
  });

  it('duplicates the current project and closes the dialog, matching New/Load — the active project just switched', () => {
    render(<ProjectLibrary />);
    fireEvent.click(screen.getByTitle('Project library'));

    fireEvent.click(screen.getByText('Duplicate'));

    expect(duplicateProject).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Projects')).toBeNull();
  });

  it(
    'keeps the dialog open and does not refresh when duplicateProject() returns false — e.g. the user had ' +
      'unsaved changes and cancelled the discard confirmation inside the store',
    () => {
      duplicateProject.mockReturnValue(false);
      render(<ProjectLibrary />);
      fireEvent.click(screen.getByTitle('Project library'));

      fireEvent.click(screen.getByText('Duplicate'));

      expect(duplicateProject).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Projects')).toBeTruthy();
    }
  );
});
