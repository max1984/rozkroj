import { useEffect } from 'react';
import { useStore as useZustand } from 'zustand';
import { useStore } from './store';
import { Toolbar } from './components/toolbar/Toolbar';
import { Sidebar } from './components/layout/Sidebar';
import { LayoutViewer } from './components/visualization/LayoutViewer';

export default function App() {
  const darkMode = useStore(s => s.darkMode);
  const { undo, redo } = useZustand(useStore.temporal);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-5">
          <LayoutViewer />
        </main>
      </div>
    </div>
  );
}
