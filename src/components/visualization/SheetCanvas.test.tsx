// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { PieceDefinition, SheetLayout } from '../../types';

// react-konva renders onto a real <canvas>, which jsdom doesn't implement —
// stub each primitive with a plain DOM element so this test can inspect
// what actually gets (re-)rendered without needing a canvas backend.
// Group is wrapped in vi.fn so its call count/args reveal exactly which
// piece(s) React re-rendered for a given state change.
const { GroupSpy } = vi.hoisted(() => ({
  GroupSpy: vi.fn(
    ({ name, onClick, onMouseEnter, onMouseLeave, children }: {
      name?: string;
      onClick?: () => void;
      onMouseEnter?: () => void;
      onMouseLeave?: () => void;
      children?: React.ReactNode;
    }) => (
      <div data-testid={name} onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        {children}
      </div>
    )
  ),
}));

vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: GroupSpy,
  Rect: () => null,
  Text: () => null,
  Line: () => null,
}));

// A real (not mocked-out) zustand store, so setSelectedPieceId/setHoveredPieceId
// trigger the same subscription-driven re-render SheetCanvas gets in production
// — a plain mutable variable (as LayoutViewer.test.tsx uses for a component it
// treats as opaque) wouldn't exercise the re-render path this test is about.
vi.mock('../../store', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand');
  const useStore = create<{
    pieces: PieceDefinition[];
    selectedPieceId: string | null;
    hoveredPieceId: string | null;
    darkMode: boolean;
    setSelectedPieceId: (id: string | null) => void;
    setHoveredPieceId: (id: string | null) => void;
  }>((set) => ({
    pieces: [],
    selectedPieceId: null,
    hoveredPieceId: null,
    darkMode: false,
    setSelectedPieceId: (id) => set({ selectedPieceId: id }),
    setHoveredPieceId: (id) => set({ hoveredPieceId: id }),
  }));
  return { useStore };
});

import { useStore } from '../../store';
import { SheetCanvas } from './SheetCanvas';

function piece(id: string, color: string): PieceDefinition {
  return {
    id, name: id, materialId: 'm1', width: 100, height: 100, quantity: 1,
    grain: 'none', rotationAllowed: true, priority: false,
    edgeBanding: { top: false, right: false, bottom: false, left: false }, color,
  };
}

function sheetWith(pieces: PieceDefinition[]): SheetLayout {
  return {
    sheetIndex: 0, materialId: 'm1', width: 2440, height: 1220,
    placedPieces: pieces.map((p, i) => ({
      definitionId: p.id, instanceIndex: i, x: i * 500, y: 0, width: 100, height: 100, rotated: false, sheetIndex: 0,
    })),
    freeRects: [], usableArea: 2440 * 1220, wastedArea: 0, wastePercent: 0,
  };
}

beforeEach(() => {
  useStore.setState({ pieces: [], selectedPieceId: null, hoveredPieceId: null, darkMode: false });
  GroupSpy.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('SheetCanvas', () => {
  it('only re-renders the hovered piece, not every other piece on the sheet', () => {
    const pieces = [piece('p1', '#4e79a7'), piece('p2', '#f28e2b'), piece('p3', '#59a14f')];
    useStore.setState({ pieces });
    const sheet = sheetWith(pieces);
    render(<SheetCanvas sheet={sheet} sheetWidth={sheet.width} sheetHeight={sheet.height} />);

    GroupSpy.mockClear();
    fireEvent.mouseEnter(screen.getByTestId('piece-p1-0'));

    const pieceCallNames = GroupSpy.mock.calls
      .map(call => (call[0] as { name?: string }).name)
      .filter((name): name is string => !!name?.startsWith('piece-'));

    // Hovering p1 changes ONLY p1's highlight — p2/p3's props are unchanged,
    // so their memoized component should not re-render (and hence not call
    // the Group spy again) at all.
    expect(pieceCallNames).toEqual(['piece-p1-0']);
  });

  it('still highlights the hovered piece correctly (sanity check)', () => {
    const pieces = [piece('p1', '#4e79a7'), piece('p2', '#f28e2b')];
    useStore.setState({ pieces });
    const sheet = sheetWith(pieces);
    render(<SheetCanvas sheet={sheet} sheetWidth={sheet.width} sheetHeight={sheet.height} />);

    fireEvent.mouseEnter(screen.getByTestId('piece-p1-0'));
    expect(useStore.getState().hoveredPieceId).toBe('p1');

    fireEvent.mouseLeave(screen.getByTestId('piece-p1-0'));
    expect(useStore.getState().hoveredPieceId).toBeNull();

    fireEvent.click(screen.getByTestId('piece-p2-1'));
    expect(useStore.getState().selectedPieceId).toBe('p2');
  });
});
