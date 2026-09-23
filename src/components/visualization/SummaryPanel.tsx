import { useStore } from '../../store';
import { useUnitDisplay } from '../../hooks/useUnitDisplay';
import { useTranslation } from '../../hooks/useTranslation';
import { totalBandingLengthMm } from '../../utils/edgeBanding';

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warn' | 'danger' }) {
  const toneClass = tone === 'danger'
    ? 'text-danger'
    : tone === 'warn'
      ? 'text-warn'
      : 'text-ink';

  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted">{label}</span>
      <span className={`text-lg font-semibold font-mono tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}

export function SummaryPanel() {
  const { t } = useTranslation();
  const layout = useStore(s => s.layout);
  const pieces = useStore(s => s.pieces);
  const { format } = useUnitDisplay();

  if (!layout || layout.sheets.length === 0) return null;

  const freshSheets = layout.sheets.filter(s => !s.sourceOffcutId).length;
  const offcutSheets = layout.sheets.length - freshSheets;
  const bandingMm = totalBandingLengthMm(pieces);

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-lg border border-line border-l-2 border-l-accent bg-surface-2 px-4 py-3">
      <Stat label={t.sheetsLabel} value={`${freshSheets}${offcutSheets > 0 ? t.offcutSuffix(offcutSheets) : ''}`} />
      <Stat
        label={t.totalWasteLabel}
        value={`${layout.totalWastePercent}%`}
        tone={layout.totalWastePercent > 30 ? 'danger' : layout.totalWastePercent > 15 ? 'warn' : undefined}
      />
      {layout.totalCost > 0 && <Stat label={t.materialCostLabel} value={layout.totalCost.toFixed(2)} />}
      {bandingMm > 0 && <Stat label={t.edgeBandingLabel} value={format(Math.round(bandingMm))} />}
      {layout.unplacedPieces.length > 0 && (
        <Stat label={t.unplacedLabel} value={String(layout.unplacedPieces.length)} tone="danger" />
      )}
    </div>
  );
}
