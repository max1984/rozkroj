import { useStore } from '../store';
import { migrateProject } from '../utils/migrateProject';
import { UNSAVED_CHANGES_CONFIRM_MESSAGE } from '../constants/defaults';

export function useSaveLoad() {
  const saveProject = useStore(s => s.saveProject);
  const loadProject = useStore(s => s.loadProject);
  const hasUnsavedChanges = useStore(s => s.hasUnsavedChanges);

  const save = () => {
    saveProject();
  };

  const loadFromFile = (file: File) => {
    if (hasUnsavedChanges && !confirm(UNSAVED_CHANGES_CONFIRM_MESSAGE)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const project = migrateProject(JSON.parse(e.target?.result as string));
        loadProject(project);
      } catch {
        alert('Invalid project file.');
      }
    };
    reader.onerror = () => alert('Could not read the file.');
    reader.readAsText(file);
  };

  const exportToFile = () => {
    const project = useStore.getState().exportProject();
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}.rozkroj.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { save, loadFromFile, exportToFile };
}
