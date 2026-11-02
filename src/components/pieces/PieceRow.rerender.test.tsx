// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { MaterialStock, PieceDefinition } from '../../types';

// edgeCount(piece.edgeBanding) is called unconditionally on every PieceRow
// render, with the piece's OWN edgeBanding object — a stable reference
// across renders (pieces aren't mutated in this test). Spying on it (while
// keeping the real implementation) lets this test see exactly which piece's
// row actually re-rendered for a given state change, the same role
// react-konva's mocked Group spy plays in SheetCanvas.test.tsx.
const { edgeCountSpy } = vi.hoisted(() => ({ edgeCountSpy: vi.fn() }));

vi.mock('../../utils/edgeBanding', async () => {
  const actual = await vi.importActual<typeof import('../../utils/edgeBanding')>('../../utils/edgeBanding');
  edgeCountSpy.mockImplementation(actual.edgeCount);
  return { ...actual, edgeCount: edgeCountSpy };
});

// A real (not flatly mocked-out) zustand store, so setSelectedPieceId
// triggers the same subscription-driven re-render each PieceRow gets in
// production — PieceRow.test.tsx's flat `selector(state)` mock wouldn't
// exercise the re-render-skipping path this test is about.
vi.mock('../../store', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand');
  const useStore = create<{
    pieces: PieceDefinition[];
    materials: MaterialStock[];
    layout: undefined;
    selectedPieceId: string | null;
    hoveredPieceId: string | null;
    language: 'en';
    unit: 'mm';
    removePiece: () => void;
    duplicatePiece: () => void;
    setSelectedPieceId: (id: string | null) => void;
    setHoveredPieceId: (id: string | null) => void;
  }>((set) => ({
    pieces: [],
    materials: [],
    layout: undefined,
    selectedPieceId: null,
    hoveredPieceId: null,
    language: 'en',
    unit: 'mm',
    removePiece: vi.fn(),
    duplicatePiece: vi.fn(),
    setSelectedPieceId: (id) => set({ selectedPieceId: id }),
    setHoveredPieceId: (id) => set({ hoveredPieceId: id }),
  }));
  return { useStore };
});

import { useStore } from '../../store';
import { PieceRow } from './PieceRow';

function piece(id: string): PieceDefinition {
  return {
    id, name: id, materialId: 'm1', width: 100, height: 100, quantity: 1,
    grain: 'none', rotationAllowed: true, priority: false,
    edgeBanding: { top: false, right: false, bottom: false, left: false }, color: '#000',
  };
}

beforeEach(() => {
  useStore.setState({ selectedPieceId: null, hoveredPieceId: null });
  edgeCountSpy.mockClear();
});

afterEach(() => cleanup());

describe('PieceRow re-render', () => {
  it('selecting one row does not re-render every other row in the list', () => {
    const p1 = piece('p1');
    const p2 = piece('p2');
    const p3 = piece('p3');
    render(
      <>
        <PieceRow piece={p1} />
        <PieceRow piece={p2} />
        <PieceRow piece={p3} />
      </>
    );

    edgeCountSpy.mockClear();
    fireEvent.click(screen.getByText('p1'));

    // Only p1's own highlight state actually changed (null -> selected) —
    // p2 and p3's rows should not have re-rendered at all.
    const rerenderedEdgeBandings = edgeCountSpy.mock.calls.map(call => call[0]);
    expect(rerenderedEdgeBandings).toEqual([p1.edgeBanding]);
  });
});
