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
  const addOffcut = useStore(s => s.addOffcut);
  const { format } = useUnitDisplay();

  const offcutsFromLayout = layout?.sheets.flatMap(sh =>
    sh.freeRects.map(r => ({ ...r, materialId: sh.materialId }))
  ) ?? [];
  // Re-clicking "Save offcuts" without the layout changing would otherwise
  // re-add the same physical scrap as new stock entries every time.
  const newOffcutsFromLayout = offcutsFromLayout.filter(r =>
    !offcutStock.some(o => o.materialId === r.materialId && o.width === r.width && o.height === r.height)
  );

  const materialName = (id: string) => materials.find(m => m.id === id)?.name;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">{t.offcutStockHeading}</h2>
        {newOffcutsFromLayout.length > 0 && (
          <button
            className="text-xs text-accent hover:underline flex items-center gap-1"
            onClick={() => newOffcutsFromLayout.forEach(r => addOffcut(r.materialId, r.width, r.height))}
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
