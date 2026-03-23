import { useStore } from '../store';
import { formatDisplay, formatInputValue, toMm, fromMm } from '../utils/units';

export function useUnitDisplay() {
  const unit = useStore(s => s.unit);
  return {
    unit,
    format: (mm: number) => formatDisplay(mm, unit),
    inputValue: (mm: number) => formatInputValue(mm, unit),
    toMm: (val: number) => toMm(val, unit),
    fromMm: (mm: number) => fromMm(mm, unit),
  };
}
