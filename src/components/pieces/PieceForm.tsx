import { useId, useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { useUnitDisplay } from '../../hooks/useUnitDisplay';
import { EdgeBandingPicker } from './EdgeBandingPicker';
import { DEFAULT_EDGE_BANDING } from '../../constants/defaults';
import { parsePositiveInt } from '../../utils/validation';
import { useTranslation } from '../../hooks/useTranslation';
import { toMm as toMmInUnit, formatInputValue } from '../../utils/units';
import type { PieceDefinition, GrainDirection, EdgeBanding } from '../../types';

interface Props {
  editing?: PieceDefinition;
  onClose: () => void;
}

export function PieceForm({ editing, onClose }: Props) {
  const formId = useId();
  const { t } = useTranslation();
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

  // width/height are seeded from inputValue(editing.width/height) only in
  // the useState initializer above — which runs once, at mount, same as
  // MaterialManager.tsx's analogous bug (now fixed there). This form
  // renders inline in the sidebar, not as a modal, so the global UnitToggle
  // stays fully clickable while editing/adding a piece — switching units
  // without this effect would leave width/height showing the OLD unit's
  // number while handleSubmit's `toMm(parseFloat(width))` uses the NEW
  // current unit, silently corrupting the piece's stored mm dimensions by
  // the conversion factor on submit, with no edit by the user at all.
  //
  // "Untouched" is determined FRESH each time this runs, by comparing the
  // CURRENT text against what the original editing.width/height would
  // display as in the OLD unit — not a sticky "has this ever been edited"
  // flag (an earlier version of this effect used one, set permanently true
  // by onChange: that meant a single edit-then-revert-to-the-same-number
  // left the field "touched" forever afterward, reopening the exact drift
  // bug below for the rest of the mount even though the displayed text was,
  // at that point, indistinguishable from untouched). When it genuinely
  // matches, resync DIRECTLY from editing.width/height's exact mm value —
  // not by reinterpreting the currently-shown text through old-unit->mm->
  // new-unit conversion math. Reusing the exact original mm value instead
  // of round-tripping through display text matters because `toMm` only
  // rounds to 0.1mm when converting FROM inch, never when the unit is
  // already mm — so a value with sub-0.1mm precision (pieces entered
  // directly in mm can have more, since mm mode is never rounded) could
  // otherwise silently drift by up to ~0.05mm on a round-trip toggle
  // (mm->inch->mm) even though the user typed nothing. Only a genuinely
  // different typed value goes through the best-effort text conversion,
  // since there's no "original" left to reuse once it no longer matches.
  const prevUnitRef = useRef(unit);
  useEffect(() => {
    if (prevUnitRef.current === unit) return;
    const fromUnit = prevUnitRef.current;
    prevUnitRef.current = unit;
    const resync = (raw: string, originalMm: number | undefined) => {
      if (originalMm !== undefined && raw === formatInputValue(originalMm, fromUnit)) {
        return formatInputValue(originalMm, unit);
      }
      const parsed = parseFloat(raw);
      if (!Number.isFinite(parsed)) return raw; // empty or invalid — leave as-is
      return formatInputValue(toMmInUnit(parsed, fromUnit), unit);
    };
    setWidth(w => resync(w, editing?.width));
    setHeight(h => resync(h, editing?.height));
    // editing?.width/height are listed for exhaustive-deps even though
    // `editing` never actually changes within one PieceForm mount (PieceRow
    // unmounts/remounts this form when toggling edit mode) — harmless
    // either way, since the guard above only acts when `unit` itself changed.
  }, [unit, editing?.width, editing?.height]);

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
        <label htmlFor={`${formId}-name`} className="block text-xs text-muted mb-1">{t.nameOptionalLabel}</label>
        <input
          id={`${formId}-name`}
          type="text"
          className="field"
          placeholder={t.namePlaceholder}
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      {materials.length > 1 && (
        <div>
          <label htmlFor={`${formId}-material`} className="block text-xs text-muted mb-1">{t.materialLabel}</label>
          <select
            id={`${formId}-material`}
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
          <label htmlFor={`${formId}-width`} className="block text-xs text-muted mb-1">{t.widthWithUnit(unit)}</label>
          <input
            id={`${formId}-width`}
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
          <label htmlFor={`${formId}-height`} className="block text-xs text-muted mb-1">{t.heightWithUnit(unit)}</label>
          <input
            id={`${formId}-height`}
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
          <label htmlFor={`${formId}-qty`} className="block text-xs text-muted mb-1">{t.qtyLabel}</label>
          <input
            id={`${formId}-qty`}
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
        <label htmlFor={`${formId}-grain`} className="block text-xs text-muted mb-1">{t.grainDirectionLabel}</label>
        <select
          id={`${formId}-grain`}
          className="field"
          value={grain}
          onChange={e => setGrain(e.target.value as GrainDirection)}
        >
          <option value="none">{t.grainNone}</option>
          <option value="horizontal">{t.grainHorizontal}</option>
          <option value="vertical">{t.grainVertical}</option>
        </select>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={rotationAllowed} onChange={e => setRotationAllowed(e.target.checked)} className="rounded accent-accent" />
          {t.allowRotation}
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={priority} onChange={e => setPriority(e.target.checked)} className="rounded accent-accent" />
          {t.priorityPiece}
        </label>
      </div>

      <EdgeBandingPicker value={edgeBanding} onChange={setEdgeBanding} />

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 btn-accent px-3 py-2 text-sm"
        >
          {editing ? t.updateButton : t.addPieceButton}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-line px-3 py-2 text-sm hover:bg-surface-2 transition-colors"
        >
          {t.cancelButton}
        </button>
      </div>
    </form>
  );
}
