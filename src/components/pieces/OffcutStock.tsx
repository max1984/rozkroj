import { Trash2, PackagePlus } from 'lucide-react';
import { useStore } from '../../store';
import { useUnitDisplay } from '../../hooks/useUnitDisplay';

export function OffcutStock() {
  const offcutStock = useStore(s => s.offcutStock);
  const removeOffcut = useStore(s => s.removeOffcut);
  const layout = useStore(s => s.layout);
  const addOffcut = useStore(s => s.addOffcut);
  const { format } = useUnitDisplay();

  const offcutsFromLayout = layout?.sheets.flatMap(sh => sh.freeRects) ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Offcut Stock</h2>
        {offcutsFromLayout.length > 0 && (
          <button
            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            onClick={() => offcutsFromLayout.forEach(r => addOffcut(r.width, r.height))}
            title="Save all current offcuts as stock"
          >
            <PackagePlus size={12} /> Save offcuts
          </button>
        )}
      </div>

      {offcutStock.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">No saved offcuts. After optimizing, click "Save offcuts" to reuse leftover pieces.</p>
      )}

      <div className="space-y-1">
        {offcutStock.map((oc, i) => (
          <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded bg-gray-100 dark:bg-gray-700">
            <span className="text-gray-700 dark:text-gray-300">{format(oc.width)} × {format(oc.height)}</span>
            <button onClick={() => removeOffcut(i)} className="text-gray-400 hover:text-red-500">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
