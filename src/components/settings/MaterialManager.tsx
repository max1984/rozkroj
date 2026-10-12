import { useId, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../../store';
import { useUnitDisplay } from '../../hooks/useUnitDisplay';
import { STANDARD_SHEET_SIZES, DEFAULT_SHEET_SIZE } from '../../constants/sheetSizes';
import { toMm } from '../../utils/units';
import { useTranslation } from '../../hooks/useTranslation';
import type { MaterialStock } from '../../types';

export function MaterialManager() {
  const { t } = useTranslation();
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
        <label className="text-sm font-medium text-ink">{t.materialsHeading}</label>
        <button
          onClick={() => {
            addMaterial({ name: `${t.defaultMaterialName} (${materials.length + 1})`, size: DEFAULT_SHEET_SIZE, pricePerSheet: 0 });
          }}
          className="icon-btn !p-1"
          title={t.addMaterialTitle}
          aria-label={t.addMaterialTitle}
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
  const id = useId();
  const { t } = useTranslation();
  const { unit, format, inputValue } = useUnitDisplay();
  const isCustom = material.size.custom;

  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left"
      >
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: material.color }} />
        <span className="flex-1 min-w-0 text-sm font-medium truncate">{material.name}</span>
        <span className="text-xs font-mono tabular-nums text-muted flex-shrink-0">
          {format(material.size.width)} × {format(material.size.height)}
        </span>
        {expanded ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
      </button>

      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-2 border-t border-line pt-2">
          <div>
            <label htmlFor={`${id}-name`} className="block text-xs text-muted mb-1">{t.nameLabel}</label>
            <input
              id={`${id}-name`}
              type="text"
              className="field"
              value={material.name}
              onChange={e => onUpdate({ name: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor={`${id}-size`} className="block text-xs text-muted mb-1">{t.sheetSizeLabel}</label>
            <select
              id={`${id}-size`}
              className="field"
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
              <option value="custom">{t.customOption}</option>
            </select>
          </div>

          {isCustom && (
            <div className="flex gap-2 items-center">
              {/* key includes both `unit` AND the current mm value: these
                  are uncontrolled inputs (defaultValue, not value) so
                  typing doesn't fight re-renders on every keystroke — but
                  that also means defaultValue is only ever applied once,
                  per mount. Without `unit` in the key, switching units
                  elsewhere (UnitToggle, mounted alongside this in
                  Sidebar.tsx) leaves the DOM input showing the OLD unit's
                  stale number while this component re-renders believing
                  the NEW unit applies — onBlur's `toMm(parseFloat(value),
                  unit)` would then reinterpret that stale number in the
                  NEW unit (e.g. "2800" mm reinterpreted as 2800 INCH =
                  71120mm), silently corrupting the stored size by the
                  conversion factor on nothing more than an incidental
                  blur. Without the mm VALUE in the key too, the same class
                  of staleness survives an external change to this exact
                  material (e.g. Undo/Redo) while the row stays expanded:
                  the header line above re-renders with the restored value,
                  but this input wouldn't remount, so it would keep
                  showing whatever was last typed into it — tabbing through
                  it afterward (even without retyping) would silently
                  reapply that stale number via onBlur, undoing the user's
                  own Undo. Keying on both forces a remount whenever either
                  changes, re-applying defaultValue with the correct
                  current number either way.

                  Known, accepted narrow gap (not fixed — real-browser-only,
                  unreproducible in this codebase's jsdom tests, and would
                  need converging onto PieceForm.tsx's controlled-value +
                  resync-effect pattern to close properly): if this exact
                  field is focused with an UNCOMMITTED edit (not yet
                  blurred) at the exact moment material.size.width changes
                  from elsewhere (e.g. Undo/Redo touching this same
                  material), removing the about-to-be-replaced DOM node can
                  synchronously fire a native blur against the OLD
                  render's closure, committing the stale uncommitted text
                  under the old key right after the external change —
                  re-overwriting what Undo/Redo just restored. */}
              <input
                key={`w-${unit}-${material.size.width}`}
                type="number"
                className="field"
                placeholder={t.widthWithUnit(unit)}
                aria-label={t.widthWithUnit(unit)}
                defaultValue={inputValue(material.size.width)}
                onBlur={e => {
                  // Compares the PARSED NUMBERS of the typed text and the
                  // current display value — NOT a plain string compare
                  // (misses "2800.0" vs "2800"), and NOT the `toMm`-
                  // converted mm result either (an earlier version of this
                  // guard did that — `w !== material.size.width` — and it
                  // was a real regression: inputValue()'s inch display
                  // already truncates to 4 decimals, so for a sub-0.1mm-
                  // precision stored width, converting the UNEDITED
                  // truncated text back through toMm can legitimately
                  // differ from the original stored value even though the
                  // user touched nothing — that comparison would then
                  // silently commit the drifted result instead of
                  // recognizing an unedited field and skipping entirely).
                  // Comparing the two parsed numbers directly catches both
                  // "truly unedited" AND "same number, different spelling"
                  // without ever running the lossy conversion for an
                  // unedited field in the first place.
                  if (parseFloat(e.target.value) === parseFloat(inputValue(material.size.width))) return;
                  const w = toMm(parseFloat(e.target.value), unit);
                  if (w > 0) onUpdate({ size: { ...material.size, width: w } });
                }}
              />
              <span className="text-muted">×</span>
              <input
                key={`h-${unit}-${material.size.height}`}
                type="number"
                className="field"
                placeholder={t.heightWithUnit(unit)}
                aria-label={t.heightWithUnit(unit)}
                defaultValue={inputValue(material.size.height)}
                onBlur={e => {
                  // Same reasoning as the width guard above.
                  if (parseFloat(e.target.value) === parseFloat(inputValue(material.size.height))) return;
                  const h = toMm(parseFloat(e.target.value), unit);
                  if (h > 0) onUpdate({ size: { ...material.size, height: h } });
                }}
              />
            </div>
          )}

          <div>
            <label htmlFor={`${id}-price`} className="block text-xs text-muted mb-1">{t.pricePerSheetLabel}</label>
            <input
              id={`${id}-price`}
              type="number"
              min="0"
              step="0.01"
              className="field"
              value={material.pricePerSheet || ''}
              placeholder="0"
              onChange={e => onUpdate({ pricePerSheet: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted">{t.pieceCountUsingMaterial(count)}</span>
            {removable && (
              <button
                onClick={onRemove}
                className="p-1 rounded-md hover:bg-danger-soft text-muted hover:text-danger"
                title={t.removeMaterialTitle}
                aria-label={t.removeMaterialTitle}
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
