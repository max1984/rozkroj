import { MaterialManager } from '../settings/MaterialManager';
import { KerfSettings } from '../settings/KerfSettings';
import { UnitToggle } from '../settings/UnitToggle';
import { AlgorithmPicker } from '../settings/AlgorithmPicker';
import { PieceList } from '../pieces/PieceList';
import { OffcutStock } from '../pieces/OffcutStock';

export function Sidebar() {
  return (
    <aside className="w-72 flex-shrink-0 border-r border-line overflow-y-auto flex flex-col bg-surface-2">
      <div className="p-4 space-y-5 flex-1">
        {/* Unit toggle at top */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-muted">Settings</span>
          <UnitToggle />
        </div>

        <MaterialManager />
        <KerfSettings />
        <AlgorithmPicker />

        <div className="border-t border-line pt-4">
          <PieceList />
        </div>

        <div className="border-t border-line pt-4">
          <OffcutStock />
        </div>
      </div>
    </aside>
  );
}
