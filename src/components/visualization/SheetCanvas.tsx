import type { } from 'react';
import { Stage, Layer, Rect, Text, Line, Group } from 'react-konva';
import { useStore } from '../../store';
import type { SheetLayout } from '../../types';

interface Props {
  sheet: SheetLayout;
  sheetWidth: number;
  sheetHeight: number;
}

const CANVAS_MAX_W = 700;
const CANVAS_MAX_H = 500;

export function SheetCanvas({ sheet, sheetWidth, sheetHeight }: Props) {
  const pieces = useStore(s => s.pieces);
  const selectedPieceId = useStore(s => s.selectedPieceId);
  const hoveredPieceId = useStore(s => s.hoveredPieceId);
  const setSelectedPieceId = useStore(s => s.setSelectedPieceId);
  const setHoveredPieceId = useStore(s => s.setHoveredPieceId);

  const scale = Math.min(CANVAS_MAX_W / sheetWidth, CANVAS_MAX_H / sheetHeight);
  const canvasW = Math.round(sheetWidth * scale);
  const canvasH = Math.round(sheetHeight * scale);

  const pieceMap = new Map(pieces.map(p => [p.id, p]));

  return (
    <div className="overflow-auto">
      <Stage width={canvasW} height={canvasH} className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
        <Layer>
          {/* Sheet background */}
          <Rect x={0} y={0} width={canvasW} height={canvasH} fill="#f9fafb" />

          {/* Waste areas (free rects) */}
          {sheet.freeRects.map((fr, i) => (
            <Rect
              key={`fr-${i}`}
              x={fr.x * scale}
              y={fr.y * scale}
              width={fr.width * scale}
              height={fr.height * scale}
              fill="rgba(239,68,68,0.08)"
              stroke="rgba(239,68,68,0.2)"
              strokeWidth={0.5}
              dash={[4, 4]}
            />
          ))}

          {/* Placed pieces */}
          {sheet.placedPieces.map((pp) => {
            const def = pieceMap.get(pp.definitionId);
            if (!def) return null;
            const isSelected = selectedPieceId === pp.definitionId;
            const isHovered = hoveredPieceId === pp.definitionId;
            const highlight = isSelected || isHovered;

            const x = pp.x * scale;
            const y = pp.y * scale;
            const w = pp.width * scale;
            const h = pp.height * scale;

            return (
              <Group
                key={`${pp.definitionId}-${pp.instanceIndex}`}
                onClick={() => setSelectedPieceId(isSelected ? null : pp.definitionId)}
                onMouseEnter={() => setHoveredPieceId(pp.definitionId)}
                onMouseLeave={() => setHoveredPieceId(null)}
              >
                <Rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={def.color + (highlight ? 'ff' : 'cc')}
                  stroke={highlight ? '#1d4ed8' : def.color}
                  strokeWidth={highlight ? 2 : 1}
                  cornerRadius={2}
                />
                {w > 30 && h > 16 && (
                  <Text
                    x={x + 3}
                    y={y + h / 2 - 6}
                    width={w - 6}
                    text={def.name}
                    fontSize={Math.min(11, w / 5, h / 2)}
                    fill="white"
                    ellipsis
                  />
                )}
              </Group>
            );
          })}

          {/* Ruler - bottom */}
          <RulerBottom sheetWidth={sheetWidth} canvasH={canvasH} scale={scale} />
        </Layer>
      </Stage>
    </div>
  );
}

function RulerBottom({ sheetWidth, canvasH, scale }: { sheetWidth: number; canvasH: number; scale: number }) {
  const tickInterval = sheetWidth > 2000 ? 200 : sheetWidth > 1000 ? 100 : 50; // mm
  const ticks: number[] = [];
  for (let mm = 0; mm <= sheetWidth; mm += tickInterval) ticks.push(mm);

  return (
    <>
      {ticks.map(mm => (
        <Group key={mm}>
          <Line
            points={[mm * scale, canvasH - 14, mm * scale, canvasH]}
            stroke="#9ca3af"
            strokeWidth={1}
          />
          <Text
            x={mm * scale - 15}
            y={canvasH - 12}
            width={30}
            text={`${mm}`}
            fontSize={9}
            fill="#9ca3af"
            align="center"
          />
        </Group>
      ))}
    </>
  );
}
