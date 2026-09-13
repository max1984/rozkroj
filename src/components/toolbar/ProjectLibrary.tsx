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
        <button
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title="Project library"
        >
          <FolderKanban size={15} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] max-h-[70vh] flex flex-col rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-sm font-semibold text-gray-800 dark:text-gray-100">Projects</Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                <X size={15} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { saveProject(); refresh(); }}
              className="flex-1 rounded bg-blue-600 text-white px-2.5 py-1.5 text-xs font-medium hover:bg-blue-700"
            >
              Save current
            </button>
            <button
              onClick={() => { newProject(); refresh(); setOpen(false); }}
              className="flex items-center gap-1 rounded border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Plus size={13} /> New
            </button>
            <button
              onClick={() => { duplicateProject(); refresh(); }}
              className="flex items-center gap-1 rounded border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Copy size={13} /> Duplicate
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {entries.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">No saved projects yet. Click "Save current" to add this one.</p>
            )}
            {entries.map(entry => {
              const isActive = entry.id === projectId;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${isActive ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                >
                  <button
                    onClick={() => { loadProjectById(entry.id); setOpen(false); }}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="text-sm font-medium truncate">{entry.name}{isActive && <span className="text-blue-500 font-normal"> · current</span>}</div>
                    <div className="text-xs text-gray-400">{new Date(entry.updatedAt).toLocaleString()}</div>
                  </button>
                  <button
                    onClick={() => { deleteProjectById(entry.id); refresh(); }}
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
                    title="Delete project"
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
