import { useState } from 'react';
import { useStore } from '../../store';
import { useUnitDisplay } from '../../hooks/useUnitDisplay';
import type { PieceDefinition, GrainDirection } from '../../types';

interface Props {
  editing?: PieceDefinition;
  onClose: () => void;
}

export function PieceForm({ editing, onClose }: Props) {
  const addPiece = useStore(s => s.addPiece);
  const updatePiece = useStore(s => s.updatePiece);
  const { unit, toMm, inputValue } = useUnitDisplay();

  const [name, setName] = useState(editing?.name ?? '');
  const [width, setWidth] = useState(editing ? inputValue(editing.width) : '');
  const [height, setHeight] = useState(editing ? inputValue(editing.height) : '');
  const [qty, setQty] = useState(String(editing?.quantity ?? 1));
  const [grain, setGrain] = useState<GrainDirection>(editing?.grain ?? 'none');
  const [rotationAllowed, setRotationAllowed] = useState(editing?.rotationAllowed ?? true);
  const [priority, setPriority] = useState(editing?.priority ?? false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = toMm(parseFloat(width));
    const h = toMm(parseFloat(height));
    if (!w || !h || w <= 0 || h <= 0) return;

    if (editing) {
      updatePiece(editing.id, { name: name || `${width}×${height}`, width: w, height: h, quantity: parseInt(qty), grain, rotationAllowed, priority });
    } else {
      addPiece({ name: name || `${width}×${height}`, width: w, height: h, quantity: parseInt(qty), grain, rotationAllowed, priority });
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4">
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name (optional)</label>
        <input
          type="text"
          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
          placeholder="e.g. Left Side"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Width ({unit})</label>
          <input
            required
            type="number"
            min="1"
            step="any"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
            value={width}
            onChange={e => setWidth(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Height ({unit})</label>
          <input
            required
            type="number"
            min="1"
            step="any"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
            value={height}
            onChange={e => setHeight(e.target.value)}
          />
        </div>
        <div className="w-20">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Qty</label>
          <input
            required
            type="number"
            min="1"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
            value={qty}
            onChange={e => setQty(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Grain Direction</label>
        <select
          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
          value={grain}
          onChange={e => setGrain(e.target.value as GrainDirection)}
        >
          <option value="none">None</option>
          <option value="horizontal">Horizontal (width direction)</option>
          <option value="vertical">Vertical (height direction)</option>
        </select>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={rotationAllowed} onChange={e => setRotationAllowed(e.target.checked)} className="rounded" />
          Allow rotation
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={priority} onChange={e => setPriority(e.target.checked)} className="rounded" />
          Priority piece
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 rounded bg-blue-600 text-white px-3 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {editing ? 'Update' : 'Add Piece'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
