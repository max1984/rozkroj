import { nanoid } from 'nanoid';
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
        // Unlike loadProjectById()/the startup-resume path — which
        // intentionally keep a project's original id to continue editing the
        // SAME library slot — "Import project file" has no such guarantee
        // about what it's loading: it could be your own earlier backup/
        // export, or a template/file shared by someone else. Its `id` was
        // baked in whenever IT was exported, and may already belong to a
        // completely different entry in THIS library (re-importing an old
        // backup of a project you still have, or reusing a shared template
        // for a second job). saveProjectToLibrary() keys purely off
        // project.id, so keeping it meant the very next "Save" silently
        // overwrote whatever unrelated project already sat under that id,
        // with no warning — same reasoning duplicateProject() (store/index.ts)
        // already applies when copying a project within the library.
        loadProject({ ...project, id: nanoid() });
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
    // Some browsers (older Firefox/Safari) read the blob asynchronously after
    // the click, so revoking the URL synchronously right after can race the
    // read and silently abort the download — defer it a tick instead.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return { save, loadFromFile, exportToFile };
}
