import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../../store';
import { SheetCanvas } from './SheetCanvas';
import { useTranslation } from '../../hooks/useTranslation';

export function LayoutViewer() {
  const { t } = useTranslation();
  const layout = useStore(s => s.layout);
  const materials = useStore(s => s.materials);
  const pieces = useStore(s => s.pieces);
  const [sheetIdx, setSheetIdx] = useState(0);

  if (!layout || layout.sheets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted text-sm">
        {pieces.length === 0 ? t.addPiecesPrompt : t.computingLayout}
      </div>
    );
  }

  const idx = Math.min(sheetIdx, layout.sheets.length - 1);
  const sheet = layout.sheets[idx];
  const material = materials.find(m => m.id === sheet.materialId);

  return (
    <div className="flex flex-col gap-3">
      {/* Sheet navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            disabled={idx === 0}
            onClick={() => setSheetIdx(i => i - 1)}
            className="icon-btn !p-1"
            title={t.prevSheetTitle}
            aria-label={t.prevSheetTitle}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium font-mono tabular-nums">
            {t.sheetCounter(idx + 1, layout.sheets.length)}
            {material && materials.length > 1 && <span className="text-muted font-normal font-sans"> — {material.name}</span>}
            {sheet.sourceOffcutId && (
              <span className="ml-1.5 text-[10px] font-sans font-semibold uppercase tracking-wide text-good align-middle">{t.offcutBadge}</span>
            )}
          </span>
          <button
            disabled={idx === layout.sheets.length - 1}
            onClick={() => setSheetIdx(i => i + 1)}
            className="icon-btn !p-1"
            title={t.nextSheetTitle}
            aria-label={t.nextSheetTitle}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <span className={`text-sm font-medium font-mono tabular-nums ${sheet.wastePercent > 30 ? 'text-danger' : sheet.wastePercent > 15 ? 'text-warn' : 'text-good'}`}>
          {t.wastePercentOnSheet(sheet.wastePercent)}
        </span>
      </div>

      <SheetCanvas
        sheet={sheet}
        sheetWidth={sheet.width}
        sheetHeight={sheet.height}
      />

      {layout.unplacedPieces.length > 0 && (
        <div className="rounded-lg bg-danger-soft border border-danger/30 p-3 text-sm text-danger">
          {t.unplacedWarning(layout.unplacedPieces.length)}
        </div>
      )}
    </div>
  );
}
