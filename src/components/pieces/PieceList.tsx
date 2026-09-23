import { useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import { useStore } from '../../store';
import { PieceRow } from './PieceRow';
import { PieceForm } from './PieceForm';
import { importCsv } from '../../utils/csv';
import { useTranslation } from '../../hooks/useTranslation';

export function PieceList() {
  const { t } = useTranslation();
  const pieces = useStore(s => s.pieces);
  const setPieces = useStore(s => s.setPieces);
  const unit = useStore(s => s.unit);
  const materials = useStore(s => s.materials);
  const [adding, setAdding] = useState(false);

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importCsv(
      file,
      unit,
      pieces.length,
      materials,
      // Read pieces fresh at completion time rather than closing over the
      // render-time value, since CSV parsing finishes asynchronously.
      (imported, unmatchedMaterialCount) => {
        setPieces([...useStore.getState().pieces, ...imported]);
        if (unmatchedMaterialCount > 0) {
          alert(t.csvUnmatchedMaterialWarning(unmatchedMaterialCount));
        }
      },
      (err) => alert(err)
    );
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">
          {t.piecesHeading}
          {pieces.length > 0 && (
            <span className="ml-2 text-xs font-mono font-normal text-muted">
              {t.totalCount(pieces.reduce((s, p) => s + p.quantity, 0))}
            </span>
          )}
        </h2>
        <div className="flex gap-1">
          <label className="icon-btn !p-1 cursor-pointer" title={t.importCsvTitle} aria-label={t.importCsvTitle}>
            <Upload size={14} />
            <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          </label>
          <button
            onClick={() => setAdding(true)}
            className="icon-btn !p-1"
            title={t.addPieceTitle}
            aria-label={t.addPieceTitle}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {adding && (
        <div className="border border-accent rounded-lg overflow-hidden">
          <PieceForm onClose={() => setAdding(false)} />
        </div>
      )}

      {pieces.length === 0 && !adding && (
        <div className="text-center py-8 text-sm text-muted">
          {t.noPiecesYet}<br />
          <button onClick={() => setAdding(true)} className="text-accent hover:underline mt-1">{t.addFirstPiece}</button>
        </div>
      )}

      <div className="space-y-1.5">
        {pieces.map(p => <PieceRow key={p.id} piece={p} />)}
      </div>
    </div>
  );
}
