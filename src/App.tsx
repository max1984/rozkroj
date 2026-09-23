import { useEffect } from 'react';
import { useStore as useZustand } from 'zustand';
import { useStore } from './store';
import { isEditableElement } from './utils/dom';
import { Toolbar } from './components/toolbar/Toolbar';
import { Sidebar } from './components/layout/Sidebar';
import { LayoutViewer } from './components/visualization/LayoutViewer';
import { SummaryPanel } from './components/visualization/SummaryPanel';

export default function App() {
  const darkMode = useStore(s => s.darkMode);
  const { undo, redo } = useZustand(useStore.temporal);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !isEditableElement(e.target)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  useEffect(() => {
    // Saving is manual (no autosave), so warn before the tab closes/reloads
    // with edits that were never saved to the project library.
    const handler = (e: BeforeUnloadEvent) => {
      if (useStore.getState().hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-bg text-ink">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-5 space-y-4">
          <SummaryPanel />
          <LayoutViewer />
        </main>
      </div>
    </div>
  );
}
