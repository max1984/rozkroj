import { SheetSizePicker } from '../settings/SheetSizePicker';
import { KerfSettings } from '../settings/KerfSettings';
import { UnitToggle } from '../settings/UnitToggle';
import { AlgorithmPicker } from '../settings/AlgorithmPicker';
import { PieceList } from '../pieces/PieceList';
import { OffcutStock } from '../pieces/OffcutStock';

export function Sidebar() {
  return (
    <aside className="w-72 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex flex-col bg-gray-50 dark:bg-gray-800/50">
      <div className="p-4 space-y-5 flex-1">
        {/* Unit toggle at top */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Settings</span>
          <UnitToggle />
        </div>

        <SheetSizePicker />
        <KerfSettings />
        <AlgorithmPicker />

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <PieceList />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <OffcutStock />
        </div>
      </div>
    </aside>
  );
}
