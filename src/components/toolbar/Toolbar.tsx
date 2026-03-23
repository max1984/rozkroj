import { useState } from 'react';
import { Undo2, Redo2, Save, FolderOpen, Download, FileDown, Sun, Moon, Layers } from 'lucide-react';
import { useStore as useZustand } from 'zustand';
import { useStore } from '../../store';
import { exportCsv } from '../../utils/csv';
import { generatePdf } from '../../utils/pdf';
import { useSaveLoad } from '../../hooks/useLocalStorage';

export function Toolbar() {
  const projectName = useStore(s => s.projectName);
  const setProjectName = useStore(s => s.setProjectName);
  const darkMode = useStore(s => s.darkMode);
  const toggleDarkMode = useStore(s => s.toggleDarkMode);
  const pieces = useStore(s => s.pieces);
  const unit = useStore(s => s.unit);
  const layout = useStore(s => s.layout);
  const { save, loadFromFile, exportToFile } = useSaveLoad();
  const [pdfAllOnOne, setPdfAllOnOne] = useState(false);
  const [showPdfOpts, setShowPdfOpts] = useState(false);

  const { undo, redo, pastStates, futureStates } = useZustand(useStore.temporal);

  const handlePdf = async () => {
    if (!layout) return;
    const project = useStore.getState().exportProject();
    await generatePdf(layout, project, pdfAllOnOne);
    setShowPdfOpts(false);
  };

  return (
    <header className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <Layers size={20} className="text-blue-600" />
        <input
          className="font-semibold text-gray-800 dark:text-gray-100 bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 text-sm"
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          title="Click to rename project"
        />
      </div>

      {/* Undo/Redo */}
      <div className="flex gap-1">
        <button
          onClick={() => undo()}
          disabled={pastStates.length === 0}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-600 dark:text-gray-400"
          title="Undo (⌘Z)"
        >
          <Undo2 size={15} />
        </button>
        <button
          onClick={() => redo()}
          disabled={futureStates.length === 0}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-600 dark:text-gray-400"
          title="Redo (⌘⇧Z)"
        >
          <Redo2 size={15} />
        </button>
      </div>

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

      {/* Save / Load */}
      <button onClick={save} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400" title="Save to browser">
        <Save size={15} />
      </button>
      <label className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-pointer" title="Open project file">
        <FolderOpen size={15} />
        <input
          type="file"
          accept=".json,.rozkroj.json"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) loadFromFile(f); e.target.value = ''; }}
        />
      </label>
      <button onClick={exportToFile} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400" title="Export project file">
        <Download size={15} />
      </button>

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

      {/* CSV Export */}
      <button
        onClick={() => exportCsv(pieces, unit)}
        disabled={pieces.length === 0}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-30"
        title="Export cut list as CSV"
      >
        <FileDown size={15} />
      </button>

      {/* PDF */}
      <div className="relative">
        <button
          onClick={() => setShowPdfOpts(v => !v)}
          disabled={!layout || layout.sheets.length === 0}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          PDF
        </button>
        {showPdfOpts && (
          <div className="absolute right-0 top-8 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 w-52 space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={pdfAllOnOne} onChange={e => setPdfAllOnOne(e.target.checked)} />
              All sheets on one page
            </label>
            <button onClick={handlePdf} className="w-full rounded bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700">
              Download PDF
            </button>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Dark mode */}
      <button onClick={toggleDarkMode} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
        {darkMode ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </header>
  );
}
