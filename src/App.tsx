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
  const language = useStore(s => s.language);
  const { undo, redo } = useZustand(useStore.temporal);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    // The static `lang="en"` in index.html never otherwise updates — left
    // stale after switching to pl/de, it tells screen readers to apply
    // English pronunciation rules to the translated UI, and tells crawlers
    // the page is in English when it isn't (same fix cwaniak's LangContext
    // already applies for its own language switcher).
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // e.key reflects the Shift-modified case — holding Shift while
      // pressing the Z key produces 'Z', not 'z' — so a case-sensitive
      // comparison here would never match Redo (Cmd/Ctrl+Shift+Z) at all.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !isEditableElement(e.target)) {
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
