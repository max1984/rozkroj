import { useStore } from '../store';

export function useSaveLoad() {
  const saveProject = useStore(s => s.saveProject);
  const loadProject = useStore(s => s.loadProject);

  const save = () => {
    saveProject();
  };

  const loadFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const project = JSON.parse(e.target?.result as string);
        loadProject(project);
      } catch {
        alert('Invalid project file.');
      }
    };
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
