import { useStore } from '../../store';
import { useUnitDisplay } from '../../hooks/useUnitDisplay';
import { totalBandingLengthMm } from '../../utils/edgeBanding';

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warn' | 'danger' }) {
  const toneClass = tone === 'danger'
    ? 'text-red-600 dark:text-red-400'
    : tone === 'warn'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-gray-800 dark:text-gray-100';

  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</span>
      <span className={`text-lg font-semibold tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}

export function SummaryPanel() {
  const layout = useStore(s => s.layout);
  const pieces = useStore(s => s.pieces);
  const { format } = useUnitDisplay();

  if (!layout || layout.sheets.length === 0) return null;

  const freshSheets = layout.sheets.filter(s => !s.sourceOffcutId).length;
  const offcutSheets = layout.sheets.length - freshSheets;
  const bandingMm = totalBandingLengthMm(pieces);

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
      <Stat label="Sheets" value={`${freshSheets}${offcutSheets > 0 ? ` +${offcutSheets} offcut` : ''}`} />
      <Stat
        label="Total waste"
        value={`${layout.totalWastePercent}%`}
        tone={layout.totalWastePercent > 30 ? 'danger' : layout.totalWastePercent > 15 ? 'warn' : undefined}
      />
      {layout.totalCost > 0 && <Stat label="Material cost" value={layout.totalCost.toFixed(2)} />}
      {bandingMm > 0 && <Stat label="Edge banding" value={format(Math.round(bandingMm))} />}
      {layout.unplacedPieces.length > 0 && (
        <Stat label="Unplaced" value={String(layout.unplacedPieces.length)} tone="danger" />
      )}
    </div>
  );
}
