import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FolderKanban, Plus, Copy, Trash2, X } from 'lucide-react';
import { useStore } from '../../store';
import { listProjects, type LibraryEntry } from '../../utils/projectLibrary';

export function ProjectLibrary() {
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
        <button className="icon-btn" title="Project library" aria-label="Project library">
          <FolderKanban size={15} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] max-h-[70vh] flex flex-col rounded-lg bg-surface border border-line shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <Dialog.Title className="text-sm font-semibold text-ink">Projects</Dialog.Title>
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
              Save current
            </button>
            <button
              onClick={() => { newProject(); refresh(); setOpen(false); }}
              className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs hover:bg-surface-2"
            >
              <Plus size={13} /> New
            </button>
            <button
              onClick={() => { duplicateProject(); refresh(); }}
              className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs hover:bg-surface-2"
            >
              <Copy size={13} /> Duplicate
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {entries.length === 0 && (
              <p className="text-xs text-muted text-center py-6">No saved projects yet. Click "Save current" to add this one.</p>
            )}
            {entries.map(entry => {
              const isActive = entry.id === projectId;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${isActive ? 'border-accent bg-accent-soft' : 'border-line'}`}
                >
                  <button
                    onClick={() => { loadProjectById(entry.id); setOpen(false); }}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="text-sm font-medium truncate">{entry.name}{isActive && <span className="text-accent font-normal"> · current</span>}</div>
                    <div className="text-xs font-mono text-muted">{new Date(entry.updatedAt).toLocaleString()}</div>
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm(`Delete "${entry.name}"? This cannot be undone.`)) return;
                      deleteProjectById(entry.id);
                      refresh();
                    }}
                    className="p-1 rounded-md hover:bg-danger-soft text-muted hover:text-danger"
                    title="Delete project"
                    aria-label="Delete project"
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
