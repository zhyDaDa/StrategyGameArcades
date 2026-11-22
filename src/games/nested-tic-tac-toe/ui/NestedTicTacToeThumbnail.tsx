import { PlayerSymbolShape } from '@/components/game/PlayerSymbol/PlayerSymbol'
import {
  PLAYER_SEAT_META,
  PLAYER_SEAT_ON_COLOR,
  type PlayerSeatSymbol,
} from '@/presentation/player-seats/player-seats'

const ORIGIN = 6
const CELL = 88 / 3
const PAPER = '#f7f3ea'
const INK = '#3a3a34'

function cellCenter(macro: number): { readonly x: number; readonly y: number } {
  return {
    x: ORIGIN + ((macro % 3) + 0.5) * CELL,
    y: ORIGIN + (Math.floor(macro / 3) + 0.5) * CELL,
  }
}

function symbolAt(
  symbol: PlayerSeatSymbol,
  color: string,
  x: number,
  y: number,
  scale: number,
) {
  return (
    <g transform={`translate(${x - 50 * scale} ${y - 50 * scale}) scale(${scale})`}>
      <PlayerSymbolShape symbol={symbol} stroke={color} />
    </g>
  )
}

/** 首页缩略图：九宫棋盘、两个已占领宫与当前可落区域描边框。 */
export function NestedTicTacToeThumbnail() {
  const red = PLAYER_SEAT_META.red
  const blue = PLAYER_SEAT_META.blue
  const microOffsets = [1, 2, 4, 5, 7, 8]
  const macroOffsets = [0, 1, 2, 3]

  const redCenter = cellCenter(0)
  const blueCenter = cellCenter(4)
  const topRight = cellCenter(2)
  const bottomLeft = cellCenter(6)
  const frameX = ORIGIN + 2 * CELL + 1.2
  const frameY = ORIGIN + CELL + 1.2
  const frameSize = CELL - 2.4

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true" focusable="false">
      <rect width="100" height="100" fill={PAPER} />

      <g stroke={INK} strokeOpacity="0.32" strokeWidth="0.9" strokeLinecap="round">
        {microOffsets.map((step) => (
          <line
            key={`micro-v-${step}`}
            x1={ORIGIN + (step * CELL) / 3}
            y1={ORIGIN}
            x2={ORIGIN + (step * CELL) / 3}
            y2={ORIGIN + 3 * CELL}
          />
        ))}
        {microOffsets.map((step) => (
          <line
            key={`micro-h-${step}`}
            x1={ORIGIN}
            y1={ORIGIN + (step * CELL) / 3}
            x2={ORIGIN + 3 * CELL}
            y2={ORIGIN + (step * CELL) / 3}
          />
        ))}
      </g>

      <g stroke={INK} strokeOpacity="0.78" strokeWidth="2.2" strokeLinecap="round">
        {macroOffsets.map((step) => (
          <line
            key={`macro-v-${step}`}
            x1={ORIGIN + step * CELL}
            y1={ORIGIN}
            x2={ORIGIN + step * CELL}
            y2={ORIGIN + 3 * CELL}
          />
        ))}
        {macroOffsets.map((step) => (
          <line
            key={`macro-h-${step}`}
            x1={ORIGIN}
            y1={ORIGIN + step * CELL}
            x2={ORIGIN + 3 * CELL}
            y2={ORIGIN + step * CELL}
          />
        ))}
      </g>

      <rect
        x={ORIGIN + 0.7}
        y={ORIGIN + 0.7}
        width={CELL - 1.4}
        height={CELL - 1.4}
        rx="1.4"
        fill={red.color}
        fillOpacity="0.9"
      />
      <rect
        x={ORIGIN + CELL + 0.7}
        y={ORIGIN + CELL + 0.7}
        width={CELL - 1.4}
        height={CELL - 1.4}
        rx="1.4"
        fill={blue.color}
        fillOpacity="0.9"
      />
      {symbolAt(red.symbol, PLAYER_SEAT_ON_COLOR, redCenter.x, redCenter.y, 0.19)}
      {symbolAt(blue.symbol, PLAYER_SEAT_ON_COLOR, blueCenter.x, blueCenter.y, 0.19)}

      {symbolAt(red.symbol, red.color, topRight.x, topRight.y, 0.09)}
      {symbolAt(blue.symbol, blue.color, bottomLeft.x, bottomLeft.y, 0.09)}
      {symbolAt(
        red.symbol,
        red.color,
        ORIGIN + 2 * CELL + CELL / 6,
        ORIGIN + 2 * CELL + CELL / 6,
        0.07,
      )}
      {symbolAt(
        blue.symbol,
        blue.color,
        ORIGIN + 2 * CELL + (CELL * 5) / 6,
        ORIGIN + 2 * CELL + (CELL * 5) / 6,
        0.07,
      )}

      <rect
        x={frameX}
        y={frameY}
        width={frameSize}
        height={frameSize}
        rx="2"
        fill="none"
        stroke={red.color}
        strokeWidth="1.8"
      />
    </svg>
  )
}