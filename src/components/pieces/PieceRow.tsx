import { useState } from 'react';
import { Pencil, Copy, Trash2, GripVertical } from 'lucide-react';
import { useStore } from '../../store';
import { useUnitDisplay } from '../../hooks/useUnitDisplay';
import type { PieceDefinition } from '../../types';
import { PieceForm } from './PieceForm';
import { edgeCount } from '../../utils/edgeBanding';
import { useTranslation } from '../../hooks/useTranslation';

interface Props {
  piece: PieceDefinition;
}

export function PieceRow({ piece }: Props) {
  const { t } = useTranslation();
  const removePiece = useStore(s => s.removePiece);
  const duplicatePiece = useStore(s => s.duplicatePiece);
  const setHoveredPieceId = useStore(s => s.setHoveredPieceId);
  const setSelectedPieceId = useStore(s => s.setSelectedPieceId);
  const selectedPieceId = useStore(s => s.selectedPieceId);
  const materials = useStore(s => s.materials);
  const unplacedCount = useStore(s => s.layout?.unplacedPieces?.filter(u => u.definitionId === piece.id).length ?? 0);
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
          {piece.grain !== 'none' && <span className="ml-1 font-sans text-warn">⟶ {t.grainIndicator}</span>}
          {edgeCount(piece.edgeBanding) > 0 && <span className="ml-1 font-sans text-accent">▭ {t.edgeIndicator}</span>}
          {unplacedCount > 0 && <span className="ml-1 font-sans text-danger">⚠ {t.pieceUnplacedCount(unplacedCount)}</span>}
          {piece.priority && <span className="ml-1 font-sans text-warn">★</span>}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); setEditing(true); }}
        className="p-1 rounded-md hover:bg-surface-2 text-muted"
        title={t.editPieceTitle}
        aria-label={t.editPieceTitle}
      >
        <Pencil size={13} />
      </button>
      <button
        onClick={e => { e.stopPropagation(); duplicatePiece(piece.id); }}
        className="p-1 rounded-md hover:bg-surface-2 text-muted"
        title={t.duplicatePieceTitle}
        aria-label={t.duplicatePieceTitle}
      >
        <Copy size={13} />
      </button>
      <button
        onClick={e => { e.stopPropagation(); removePiece(piece.id); }}
        className="p-1 rounded-md hover:bg-danger-soft text-muted hover:text-danger"
        title={t.deletePieceTitle}
        aria-label={t.deletePieceTitle}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
