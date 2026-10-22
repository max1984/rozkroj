import { Trash2, PackagePlus } from 'lucide-react';
import { useStore } from '../../store';
import { useUnitDisplay } from '../../hooks/useUnitDisplay';
import { useTranslation } from '../../hooks/useTranslation';

export function OffcutStock() {
  const { t } = useTranslation();
  const offcutStock = useStore(s => s.offcutStock);
  const removeOffcut = useStore(s => s.removeOffcut);
  const layout = useStore(s => s.layout);
  const materials = useStore(s => s.materials);
  const addOffcuts = useStore(s => s.addOffcuts);
  const { format } = useUnitDisplay();

  const offcutsFromLayout = layout?.sheets.flatMap(sh =>
    sh.freeRects.map(r => ({ ...r, materialId: sh.materialId }))
  ) ?? [];
  // Re-clicking "Save offcuts" without the layout changing would otherwise
  // re-add the same physical scrap as new stock entries every time. Matching
  // must be count-based, not mere existence: two different sheets can each
  // leave an offcut of the same size, and if only one of those same-size
  // offcuts was saved before, the other is still genuinely new scrap.
  const offcutKey = (materialId: string, width: number, height: number) => `${materialId}|${width}|${height}`;
  const remainingSavedCounts = new Map<string, number>();
  for (const o of offcutStock) {
    const key = offcutKey(o.materialId, o.width, o.height);
    remainingSavedCounts.set(key, (remainingSavedCounts.get(key) ?? 0) + 1);
  }
  const newOffcutsFromLayout = offcutsFromLayout.filter(r => {
    const key = offcutKey(r.materialId, r.width, r.height);
    const saved = remainingSavedCounts.get(key) ?? 0;
    if (saved > 0) {
      remainingSavedCounts.set(key, saved - 1);
      return false;
    }
    return true;
  });

  const materialName = (id: string) => materials.find(m => m.id === id)?.name;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">{t.offcutStockHeading}</h2>
        {newOffcutsFromLayout.length > 0 && (
          <button
            className="text-xs text-accent hover:underline flex items-center gap-1"
            onClick={() => addOffcuts(newOffcutsFromLayout.map(r => ({ materialId: r.materialId, width: r.width, height: r.height })))}
            title={t.saveOffcutsTitle}
          >
            <PackagePlus size={12} /> {t.saveOffcuts}
          </button>
        )}
      </div>

      {offcutStock.length === 0 && (
        <p className="text-xs text-muted">
          {t.noSavedOffcuts}
        </p>
      )}

      <div className="space-y-1">
        {offcutStock.map(oc => (
          <div key={oc.id} className="flex items-center justify-between text-xs p-1.5 rounded-md bg-surface-2">
            <span className="font-mono tabular-nums text-ink">
              {format(oc.width)} × {format(oc.height)}
              {materials.length > 1 && <span className="text-muted font-sans"> · {materialName(oc.materialId)}</span>}
            </span>
            <button onClick={() => removeOffcut(oc.id)} className="text-muted hover:text-danger" title={t.removeOffcutTitle} aria-label={t.removeOffcutTitle}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
