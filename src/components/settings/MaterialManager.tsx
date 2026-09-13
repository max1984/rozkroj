import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../../store';
import { useUnitDisplay } from '../../hooks/useUnitDisplay';
import { STANDARD_SHEET_SIZES, DEFAULT_SHEET_SIZE } from '../../constants/sheetSizes';
import { DEFAULT_MATERIAL_NAME } from '../../constants/defaults';
import { toMm } from '../../utils/units';
import type { MaterialStock } from '../../types';

export function MaterialManager() {
  const materials = useStore(s => s.materials);
  const pieces = useStore(s => s.pieces);
  const addMaterial = useStore(s => s.addMaterial);
  const updateMaterial = useStore(s => s.updateMaterial);
  const removeMaterial = useStore(s => s.removeMaterial);
  const [expandedId, setExpandedId] = useState<string | null>(materials[0]?.id ?? null);

  const pieceCount = (materialId: string) =>
    pieces.filter(p => p.materialId === materialId).reduce((s, p) => s + p.quantity, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Materials</label>
        <button
          onClick={() => {
            addMaterial({ name: `${DEFAULT_MATERIAL_NAME} (${materials.length + 1})`, size: DEFAULT_SHEET_SIZE, pricePerSheet: 0 });
          }}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          title="Add material"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="space-y-1.5">
        {materials.map(m => (
          <MaterialRow
            key={m.id}
            material={m}
            count={pieceCount(m.id)}
            expanded={expandedId === m.id}
            onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
            onUpdate={(patch) => updateMaterial(m.id, patch)}
            onRemove={() => removeMaterial(m.id)}
            removable={materials.length > 1}
          />
        ))}
      </div>
    </div>
  );
}

function MaterialRow({
  material, count, expanded, onToggle, onUpdate, onRemove, removable,
}: {
  material: MaterialStock;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<MaterialStock>) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const { unit, format, inputValue } = useUnitDisplay();
  const isCustom = material.size.custom;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left"
      >
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: material.color }} />
        <span className="flex-1 min-w-0 text-sm font-medium truncate">{material.name}</span>
        <span className="text-xs text-gray-400 flex-shrink-0">
          {format(material.size.width)} × {format(material.size.height)}
        </span>
        {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-2 border-t border-gray-200 dark:border-gray-700 pt-2">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
            <input
              type="text"
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
              value={material.name}
              onChange={e => onUpdate({ name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sheet size</label>
            <select
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
              value={isCustom ? 'custom' : `${material.size.width}x${material.size.height}`}
              onChange={e => {
                if (e.target.value === 'custom') {
                  onUpdate({ size: { label: 'Custom', width: material.size.width, height: material.size.height, custom: true } });
                } else {
                  const found = STANDARD_SHEET_SIZES.find(s => `${s.width}x${s.height}` === e.target.value);
                  if (found) onUpdate({ size: found });
                }
              }}
            >
              {STANDARD_SHEET_SIZES.filter(s => !s.custom).map(s => (
                <option key={`${s.width}x${s.height}`} value={`${s.width}x${s.height}`}>{s.label}</option>
              ))}
              <option value="custom">Custom</option>
            </select>
          </div>

          {isCustom && (
            <div className="flex gap-2 items-center">
              <input
                type="number"
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
                placeholder={`Width (${unit})`}
                defaultValue={inputValue(material.size.width)}
                onBlur={e => {
                  const w = toMm(parseFloat(e.target.value), unit);
                  if (w > 0) onUpdate({ size: { ...material.size, width: w } });
                }}
              />
              <span className="text-gray-500">×</span>
              <input
                type="number"
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
                placeholder={`Height (${unit})`}
                defaultValue={inputValue(material.size.height)}
                onBlur={e => {
                  const h = toMm(parseFloat(e.target.value), unit);
                  if (h > 0) onUpdate({ size: { ...material.size, height: h } });
                }}
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Price per sheet</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
              value={material.pricePerSheet || ''}
              placeholder="0"
              onChange={e => onUpdate({ pricePerSheet: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-400">{count} piece{count !== 1 ? 's' : ''} using this material</span>
            {removable && (
              <button
                onClick={onRemove}
                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
                title="Remove material"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
