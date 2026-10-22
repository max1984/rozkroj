import { useStore } from '../store';
import { migrateProject } from '../utils/migrateProject';
import { useTranslation } from './useTranslation';

export function useSaveLoad() {
  const { t } = useTranslation();
  const saveProject = useStore(s => s.saveProject);
  const loadProject = useStore(s => s.loadProject);
  const confirmDiscardUnsaved = useStore(s => s.confirmDiscardUnsaved);

  const save = () => {
    saveProject();
  };

  const loadFromFile = (file: File) => {
    if (!confirmDiscardUnsaved()) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const project = migrateProject(JSON.parse(e.target?.result as string));
        loadProject(project);
      } catch {
        alert(t.invalidProjectFile);
      }
    };
    reader.onerror = () => alert(t.couldNotReadFile);
    reader.readAsText(file);
  };

  const exportToFile = () => {
    const project = useStore.getState().exportProject();
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Toolbar's rename field has no minimum-length validation, so projectName
    // can be '' (or just whitespace) while mid-edit — without this fallback,
    // the download's filename became exactly ".rozkroj.json", a HIDDEN file
    // on macOS/Linux that's easy to lose track of in a Downloads folder.
    const safeName = project.name.trim() || t.newProjectDefaultName;
    a.download = `${safeName.replace(/\s+/g, '_')}.rozkroj.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { save, loadFromFile, exportToFile };
}
