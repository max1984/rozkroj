import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FolderKanban, Plus, Copy, Trash2, X } from 'lucide-react';
import { useStore } from '../../store';
import { listProjects, type LibraryEntry } from '../../utils/projectLibrary';
import { useTranslation } from '../../hooks/useTranslation';

export function ProjectLibrary() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const projectId = useStore(s => s.projectId);
  const newProject = useStore(s => s.newProject);
  const duplicateProject = useStore(s => s.duplicateProject);
  const loadProjectById = useStore(s => s.loadProjectById);
  const deleteProjectById = useStore(s => s.deleteProjectById);
  const saveProject = useStore(s => s.saveProject);

  const refresh = () => setEntries(listProjects());

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); if (v) refresh(); }}>
      <Dialog.Trigger asChild>
        <button className="icon-btn" title={t.projectLibraryTitle} aria-label={t.projectLibraryTitle}>
          <FolderKanban size={15} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] max-h-[70vh] flex flex-col rounded-lg bg-surface border border-line shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <Dialog.Title className="text-sm font-semibold text-ink">{t.projectsHeading}</Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 rounded-md hover:bg-surface-2 text-muted">
                <X size={15} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex gap-2 px-4 py-2 border-b border-line">
            <button
              onClick={() => { saveProject(); refresh(); }}
              className="flex-1 btn-accent px-2.5 py-1.5 text-xs"
            >
              {t.saveCurrent}
            </button>
            <button
              onClick={() => {
                // newProject() itself now checks for unsaved changes and
                // confirms before discarding them (store/index.ts) — it
                // returns false without doing anything if the user cancels,
                // so refresh/close only happen once the switch actually
                // happened.
                if (!newProject()) return;
                refresh(); setOpen(false);
              }}
              className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs hover:bg-surface-2"
            >
              <Plus size={13} /> {t.newProject}
            </button>
            <button
              onClick={() => {
                // Same shape as New above — duplicateProject() checks for
                // unsaved changes itself now (with its own, more accurate
                // message: unlike New/Load, it doesn't actually lose the
                // edits, they end up in the new duplicate — it's the
                // ORIGINAL project's own saved copy that's left without
                // them).
                if (!duplicateProject()) return;
                refresh(); setOpen(false);
              }}
              className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs hover:bg-surface-2"
            >
              <Copy size={13} /> {t.duplicateProject}
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {entries.length === 0 && (
              <p className="text-xs text-muted text-center py-6">{t.noSavedProjects}</p>
            )}
            {entries.map(entry => {
              const isActive = entry.id === projectId;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${isActive ? 'border-accent bg-accent-soft' : 'border-line'}`}
                >
                  <button
                    onClick={() => {
                      if (!loadProjectById(entry.id)) return;
                      setOpen(false);
                    }}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="text-sm font-medium truncate">{entry.name}{isActive && <span className="text-accent font-normal"> · {t.currentLabel}</span>}</div>
                    <div className="text-xs font-mono text-muted">{new Date(entry.updatedAt).toLocaleString()}</div>
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm(t.deleteProjectConfirm(entry.name))) return;
                      deleteProjectById(entry.id);
                      refresh();
                    }}
                    className="p-1 rounded-md hover:bg-danger-soft text-muted hover:text-danger"
                    title={t.deleteProjectTitle}
                    aria-label={t.deleteProjectTitle}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
