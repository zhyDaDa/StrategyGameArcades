import { DOTS_SEAT_META } from './seat-meta'
import { SeatSymbolShape } from './SeatSymbol'

const DOTS = [16, 50, 84] as const
const BOX_SIZE = 27
const SYMBOL_SCALE = 0.2

const BOXES: ReadonlyArray<{ x: number; y: number; seat: keyof typeof DOTS_SEAT_META }> = [
  { x: 19.5, y: 19.5, seat: 'red' },
  { x: 53.5, y: 19.5, seat: 'blue' },
  { x: 19.5, y: 53.5, seat: 'green' },
  { x: 53.5, y: 53.5, seat: 'yellow' },
]

/** 首页缩略图：静态 2×2 的已占满局面，四个格子分属四家并带各自符号。 */
export function DotsAndBoxesThumbnail() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true" focusable="false">
      <rect width="100" height="100" fill="#f7f3ea" />
      {BOXES.map(({ x, y, seat }) => {
        const { color, symbol } = DOTS_SEAT_META[seat]
        const offset = BOX_SIZE / 2 - 50 * SYMBOL_SCALE
        return (
          <g key={seat}>
            <rect
              x={x}
              y={y}
              width={BOX_SIZE}
              height={BOX_SIZE}
              rx="2"
              fill={color}
              fillOpacity="0.85"
            />
            <g transform={`translate(${x + offset} ${y + offset}) scale(${SYMBOL_SCALE})`}>
              <SeatSymbolShape symbol={symbol} stroke="#fbf8f1" />
            </g>
          </g>
        )
      })}
      {DOTS.map((at) => (
        <g key={at} stroke="#3a3a34" strokeWidth="1.6" strokeLinecap="round">
          <line x1="16" y1={at} x2="84" y2={at} />
          <line x1={at} y1="16" x2={at} y2="84" />
        </g>
      ))}
      {DOTS.map((y) =>
        DOTS.map((x) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.4" fill="#3a3a34" />
        )),
      )}
    </svg>
  )
}