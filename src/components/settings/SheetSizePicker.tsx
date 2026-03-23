import { useState } from 'react';
import { useStore } from '../../store';
import { STANDARD_SHEET_SIZES } from '../../constants/sheetSizes';
import { useUnitDisplay } from '../../hooks/useUnitDisplay';
import { toMm } from '../../utils/units';

export function SheetSizePicker() {
  const settings = useStore(s => s.settings);
  const setSettings = useStore(s => s.setSettings);
  const { unit } = useUnitDisplay();

  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');

  const isCustom = settings.size.custom;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sheet Size</label>
      <select
        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
        value={isCustom ? 'custom' : `${settings.size.width}x${settings.size.height}`}
        onChange={e => {
          if (e.target.value === 'custom') {
            setSettings({ size: { label: 'Custom', width: settings.size.width, height: settings.size.height, custom: true } });
          } else {
            const found = STANDARD_SHEET_SIZES.find(s => `${s.width}x${s.height}` === e.target.value);
            if (found) setSettings({ size: found });
          }
        }}
      >
        {STANDARD_SHEET_SIZES.filter(s => !s.custom).map(s => (
          <option key={`${s.width}x${s.height}`} value={`${s.width}x${s.height}`}>{s.label}</option>
        ))}
        <option value="custom">Custom</option>
      </select>

      {isCustom && (
        <div className="flex gap-2 items-center">
          <input
            type="number"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
            placeholder={`Width (${unit})`}
            value={customW}
            onChange={e => setCustomW(e.target.value)}
            onBlur={() => {
              const w = toMm(parseFloat(customW), unit);
              if (w > 0) setSettings({ size: { ...settings.size, width: w } });
            }}
          />
          <span className="text-gray-500">×</span>
          <input
            type="number"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
            placeholder={`Height (${unit})`}
            value={customH}
            onChange={e => setCustomH(e.target.value)}
            onBlur={() => {
              const h = toMm(parseFloat(customH), unit);
              if (h > 0) setSettings({ size: { ...settings.size, height: h } });
            }}
          />
        </div>
      )}
    </div>
  );
}
