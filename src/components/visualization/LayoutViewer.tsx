import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../../store';
import { SheetCanvas } from './SheetCanvas';

export function LayoutViewer() {
  const layout = useStore(s => s.layout);
  const settings = useStore(s => s.settings);
  const pieces = useStore(s => s.pieces);
  const [sheetIdx, setSheetIdx] = useState(0);

  if (!layout || layout.sheets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        {pieces.length === 0 ? 'Add pieces to see the layout' : 'Computing layout…'}
      </div>
    );
  }

  const idx = Math.min(sheetIdx, layout.sheets.length - 1);
  const sheet = layout.sheets[idx];

  return (
    <div className="flex flex-col gap-3">
      {/* Sheet navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            disabled={idx === 0}
            onClick={() => setSheetIdx(i => i - 1)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium">
            Sheet {idx + 1} / {layout.sheets.length}
          </span>
          <button
            disabled={idx === layout.sheets.length - 1}
            onClick={() => setSheetIdx(i => i + 1)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className={`font-medium ${sheet.wastePercent > 30 ? 'text-red-500' : sheet.wastePercent > 15 ? 'text-amber-500' : 'text-green-600'}`}>
            {sheet.wastePercent}% waste
          </span>
          <span className="text-gray-400 text-xs">
            Total: {layout.totalWastePercent}% across {layout.sheets.length} sheet{layout.sheets.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <SheetCanvas
        sheet={sheet}
        sheetWidth={settings.size.width}
        sheetHeight={settings.size.height}
      />

      {layout.unplacedPieces.length > 0 && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
          ⚠ {layout.unplacedPieces.length} piece{layout.unplacedPieces.length !== 1 ? 's' : ''} could not be placed (too large for sheet)
        </div>
      )}
    </div>
  );
}
