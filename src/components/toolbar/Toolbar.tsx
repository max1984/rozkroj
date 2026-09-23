import { useState } from 'react';
import { Undo2, Redo2, Save, FolderOpen, Download, FileDown, Sun, Moon } from 'lucide-react';
import { useStore as useZustand } from 'zustand';
import { useStore } from '../../store';
import { exportCsv } from '../../utils/csv';
import { useSaveLoad } from '../../hooks/useLocalStorage';
import { useTranslation } from '../../hooks/useTranslation';
import { ProjectLibrary } from './ProjectLibrary';

function CutMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="17" height="17" rx="1.5" stroke="currentColor" strokeWidth="1.4" className="text-line" />
      <path d="M2 13 L13 2" stroke="var(--color-accent)" strokeWidth="1.6" strokeDasharray="2.4 2" strokeLinecap="round" />
    </svg>
  );
}

export function Toolbar() {
  const { t } = useTranslation();
  const projectName = useStore(s => s.projectName);
  const setProjectName = useStore(s => s.setProjectName);
  const hasUnsavedChanges = useStore(s => s.hasUnsavedChanges);
  const darkMode = useStore(s => s.darkMode);
  const toggleDarkMode = useStore(s => s.toggleDarkMode);
  const pieces = useStore(s => s.pieces);
  const unit = useStore(s => s.unit);
  const materials = useStore(s => s.materials);
  const layout = useStore(s => s.layout);
  const { save, loadFromFile, exportToFile } = useSaveLoad();
  const [pdfAllOnOne, setPdfAllOnOne] = useState(false);
  const [showPdfOpts, setShowPdfOpts] = useState(false);

  const { undo, redo, pastStates, futureStates } = useZustand(useStore.temporal);

  const handlePdf = async () => {
    if (!layout) return;
    try {
      // jsPDF + autotable are a heavy dependency only needed once someone
      // actually exports a PDF, so they're loaded on demand instead of
      // bloating the initial bundle every visitor downloads. That chunk can
      // fail to load — e.g. a stale page still open after a new deploy
      // replaced it — so this needs its own error handling rather than
      // failing as a silent, uncaught promise rejection.
      const { generatePdf } = await import('../../utils/pdf');
      const project = useStore.getState().exportProject();
      await generatePdf(layout, project, pdfAllOnOne);
      setShowPdfOpts(false);
    } catch {
      alert(t.pdfGenerationFailed);
    }
  };

  return (
    <header className="flex items-center gap-3 px-4 py-2.5 border-b border-line bg-surface">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <CutMark />
        <input
          className="font-semibold text-ink bg-transparent border-none outline-none focus:ring-1 focus:ring-accent rounded-sm px-1 text-sm"
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          title={t.renameProjectTitle}
          aria-label={t.projectNameLabel}
        />
        {hasUnsavedChanges && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-warn flex-shrink-0"
            title={t.unsavedChangesTitle}
            aria-label={t.unsavedChangesTitle}
            role="status"
          />
        )}
      </div>

      {/* Undo/Redo */}
      <div className="flex gap-1">
        <button
          onClick={() => undo()}
          disabled={pastStates.length === 0}
          className="icon-btn"
          title={t.undoTitle}
          aria-label={t.undoLabel}
        >
          <Undo2 size={15} />
        </button>
        <button
          onClick={() => redo()}
          disabled={futureStates.length === 0}
          className="icon-btn"
          title={t.redoTitle}
          aria-label={t.redoLabel}
        >
          <Redo2 size={15} />
        </button>
      </div>

      <div className="w-px h-5 bg-line" />

      {/* Save / Load */}
      <ProjectLibrary />
      <button
        onClick={save}
        className={`icon-btn ${hasUnsavedChanges ? 'text-warn' : ''}`}
        title={hasUnsavedChanges ? t.saveProjectUnsavedTitle : t.saveProjectTitle}
        aria-label={hasUnsavedChanges ? t.saveProjectUnsavedTitle : t.saveProjectTitle}
      >
        <Save size={15} />
      </button>
      <label className="icon-btn cursor-pointer" title={t.importProjectFileTitle} aria-label={t.importProjectFileTitle}>
        <FolderOpen size={15} />
        <input
          type="file"
          accept=".json,.rozkroj.json"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) loadFromFile(f); e.target.value = ''; }}
        />
      </label>
      <button onClick={exportToFile} className="icon-btn" title={t.exportProjectFileTitle} aria-label={t.exportProjectFileTitle}>
        <Download size={15} />
      </button>

      <div className="w-px h-5 bg-line" />

      {/* CSV Export */}
      <button
        onClick={() => exportCsv(pieces, materials, unit)}
        disabled={pieces.length === 0}
        className="icon-btn"
        title={t.exportCsvTitle}
        aria-label={t.exportCsvTitle}
      >
        <FileDown size={15} />
      </button>

      {/* PDF */}
      <div className="relative">
        <button
          onClick={() => setShowPdfOpts(v => !v)}
          disabled={!layout || layout.sheets.length === 0}
          aria-expanded={showPdfOpts}
          className="flex items-center gap-1 px-3 py-1 rounded-md bg-accent text-accent-ink text-xs font-semibold tracking-wide hover:brightness-105 disabled:opacity-40 transition"
        >
          {t.pdfButton}
        </button>
        {showPdfOpts && (
          <div className="absolute right-0 top-9 z-10 bg-surface border border-line rounded-lg shadow-lg p-3 w-52 space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={pdfAllOnOne} onChange={e => setPdfAllOnOne(e.target.checked)} />
              {t.allSheetsOnOnePage}
            </label>
            <button onClick={handlePdf} className="w-full rounded-md bg-accent text-accent-ink px-3 py-1.5 text-sm font-medium hover:brightness-105">
              {t.downloadPdf}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Dark mode */}
      <button onClick={toggleDarkMode} className="icon-btn" title={t.toggleThemeTitle} aria-label={t.toggleThemeTitle}>
        {darkMode ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </header>
  );
}
