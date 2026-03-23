import { useState } from 'react';
import { Pencil, Trash2, GripVertical } from 'lucide-react';
import { useStore } from '../../store';
import { useUnitDisplay } from '../../hooks/useUnitDisplay';
import type { PieceDefinition } from '../../types';
import { PieceForm } from './PieceForm';

interface Props {
  piece: PieceDefinition;
}

export function PieceRow({ piece }: Props) {
  const removePiece = useStore(s => s.removePiece);
  const setHoveredPieceId = useStore(s => s.setHoveredPieceId);
  const setSelectedPieceId = useStore(s => s.setSelectedPieceId);
  const selectedPieceId = useStore(s => s.selectedPieceId);
  const { format } = useUnitDisplay();
  const [editing, setEditing] = useState(false);

  const isSelected = selectedPieceId === piece.id;

  if (editing) {
    return (
      <div className="border border-blue-300 dark:border-blue-700 rounded-lg overflow-hidden">
        <PieceForm editing={piece} onClose={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
      onClick={() => setSelectedPieceId(isSelected ? null : piece.id)}
      onMouseEnter={() => setHoveredPieceId(piece.id)}
      onMouseLeave={() => setHoveredPieceId(null)}
    >
      <GripVertical size={14} className="text-gray-400 flex-shrink-0" />
      <div
        className="w-3 h-3 rounded-sm flex-shrink-0"
        style={{ backgroundColor: piece.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{piece.name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {format(piece.width)} × {format(piece.height)} × {piece.quantity}
          {piece.grain !== 'none' && <span className="ml-1 text-amber-600 dark:text-amber-400">⟶ grain</span>}
          {piece.priority && <span className="ml-1 text-purple-600 dark:text-purple-400">★</span>}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); setEditing(true); }}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
      >
        <Pencil size={13} />
      </button>
      <button
        onClick={e => { e.stopPropagation(); removePiece(piece.id); }}
        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
