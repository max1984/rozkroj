import { useState } from 'react';
import { Pencil, Trash2, GripVertical } from 'lucide-react';
import { useStore } from '../../store';
import { useUnitDisplay } from '../../hooks/useUnitDisplay';
import type { PieceDefinition } from '../../types';
import { PieceForm } from './PieceForm';
import { edgeCount } from '../../utils/edgeBanding';

interface Props {
  piece: PieceDefinition;
}

export function PieceRow({ piece }: Props) {
  const removePiece = useStore(s => s.removePiece);
  const setHoveredPieceId = useStore(s => s.setHoveredPieceId);
  const setSelectedPieceId = useStore(s => s.setSelectedPieceId);
  const selectedPieceId = useStore(s => s.selectedPieceId);
  const materials = useStore(s => s.materials);
  const { format } = useUnitDisplay();
  const [editing, setEditing] = useState(false);
  const material = materials.find(m => m.id === piece.materialId);

  const isSelected = selectedPieceId === piece.id;

  if (editing) {
    return (
      <div className="border border-accent rounded-lg overflow-hidden">
        <PieceForm editing={piece} onClose={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'border-accent bg-accent-soft' : 'border-line hover:border-muted'}`}
      onClick={() => setSelectedPieceId(isSelected ? null : piece.id)}
      onMouseEnter={() => setHoveredPieceId(piece.id)}
      onMouseLeave={() => setHoveredPieceId(null)}
    >
      <GripVertical size={14} className="text-muted flex-shrink-0" />
      <div
        className="w-3 h-3 rounded-sm flex-shrink-0"
        style={{ backgroundColor: piece.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{piece.name}</div>
        <div className="text-xs font-mono tabular-nums text-muted">
          {format(piece.width)} × {format(piece.height)} × {piece.quantity}
          {material && materials.length > 1 && <span className="ml-1 font-sans">· {material.name}</span>}
          {piece.grain !== 'none' && <span className="ml-1 font-sans text-warn">⟶ grain</span>}
          {edgeCount(piece.edgeBanding) > 0 && <span className="ml-1 font-sans text-accent">▭ edge</span>}
          {piece.priority && <span className="ml-1 font-sans text-warn">★</span>}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); setEditing(true); }}
        className="p-1 rounded-md hover:bg-surface-2 text-muted"
        title="Edit piece"
        aria-label="Edit piece"
      >
        <Pencil size={13} />
      </button>
      <button
        onClick={e => { e.stopPropagation(); removePiece(piece.id); }}
        className="p-1 rounded-md hover:bg-danger-soft text-muted hover:text-danger"
        title="Delete piece"
        aria-label="Delete piece"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
