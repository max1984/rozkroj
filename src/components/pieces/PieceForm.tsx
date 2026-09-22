import { useState } from 'react';
import { useStore } from '../../store';
import { useUnitDisplay } from '../../hooks/useUnitDisplay';
import { EdgeBandingPicker } from './EdgeBandingPicker';
import { DEFAULT_EDGE_BANDING } from '../../constants/defaults';
import { parsePositiveInt } from '../../utils/validation';
import type { PieceDefinition, GrainDirection, EdgeBanding } from '../../types';

interface Props {
  editing?: PieceDefinition;
  onClose: () => void;
}

export function PieceForm({ editing, onClose }: Props) {
  const addPiece = useStore(s => s.addPiece);
  const updatePiece = useStore(s => s.updatePiece);
  const materials = useStore(s => s.materials);
  const { unit, toMm, inputValue } = useUnitDisplay();

  const [name, setName] = useState(editing?.name ?? '');
  const [materialId, setMaterialId] = useState(editing?.materialId ?? materials[0]?.id ?? '');
  const [width, setWidth] = useState(editing ? inputValue(editing.width) : '');
  const [height, setHeight] = useState(editing ? inputValue(editing.height) : '');
  const [qty, setQty] = useState(String(editing?.quantity ?? 1));
  const [grain, setGrain] = useState<GrainDirection>(editing?.grain ?? 'none');
  const [rotationAllowed, setRotationAllowed] = useState(editing?.rotationAllowed ?? true);
  const [priority, setPriority] = useState(editing?.priority ?? false);
  const [edgeBanding, setEdgeBanding] = useState<EdgeBanding>(editing?.edgeBanding ?? DEFAULT_EDGE_BANDING);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = toMm(parseFloat(width));
    const h = toMm(parseFloat(height));
    const quantity = parsePositiveInt(qty);
    if (!w || !h || w <= 0 || h <= 0 || quantity === null) return;

    if (editing) {
      updatePiece(editing.id, { name: name || `${width}×${height}`, materialId, width: w, height: h, quantity, grain, rotationAllowed, priority, edgeBanding });
    } else {
      addPiece({ name: name || `${width}×${height}`, materialId, width: w, height: h, quantity, grain, rotationAllowed, priority, edgeBanding });
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4">
      <div>
        <label className="block text-xs text-muted mb-1">Name (optional)</label>
        <input
          type="text"
          className="field"
          placeholder="e.g. Left Side"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      {materials.length > 1 && (
        <div>
          <label className="block text-xs text-muted mb-1">Material</label>
          <select
            className="field"
            value={materialId}
            onChange={e => setMaterialId(e.target.value)}
          >
            {materials.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs text-muted mb-1">Width ({unit})</label>
          <input
            required
            type="number"
            min="1"
            step="any"
            className="field font-mono tabular-nums"
            value={width}
            onChange={e => setWidth(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-muted mb-1">Height ({unit})</label>
          <input
            required
            type="number"
            min="1"
            step="any"
            className="field font-mono tabular-nums"
            value={height}
            onChange={e => setHeight(e.target.value)}
          />
        </div>
        <div className="w-20">
          <label className="block text-xs text-muted mb-1">Qty</label>
          <input
            required
            type="number"
            min="1"
            className="field font-mono tabular-nums"
            value={qty}
            onChange={e => setQty(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Grain Direction</label>
        <select
          className="field"
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
          <input type="checkbox" checked={rotationAllowed} onChange={e => setRotationAllowed(e.target.checked)} className="rounded accent-accent" />
          Allow rotation
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={priority} onChange={e => setPriority(e.target.checked)} className="rounded accent-accent" />
          Priority piece
        </label>
      </div>

      <EdgeBandingPicker value={edgeBanding} onChange={setEdgeBanding} />

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 btn-accent px-3 py-2 text-sm"
        >
          {editing ? 'Update' : 'Add Piece'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-line px-3 py-2 text-sm hover:bg-surface-2 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
