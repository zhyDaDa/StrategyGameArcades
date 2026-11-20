import type { DotsAndBoxesSeat } from '../domain/types'
import { DOTS_SEAT_META, type DotsSeatSymbol } from './seat-meta'

export interface SeatSymbolProps {
  readonly seat: DotsAndBoxesSeat
  readonly className?: string
}

/** 席位符号：颜色来自 DOTS_SEAT_META，形状由符号类型决定。 */
export function SeatSymbol({ seat, className }: SeatSymbolProps) {
  const { color, symbol } = DOTS_SEAT_META[seat]
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={className}
      style={{ color }}
    >
      {renderShape(symbol)}
    </svg>
  )
}

function renderShape(symbol: DotsSeatSymbol) {
  const strokeProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 11,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (symbol) {
    case 'circle':
      return <circle cx="50" cy="50" r="31" {...strokeProps} />
    case 'cross':
      return <path d="M29 29 L71 71 M71 29 L29 71" {...strokeProps} />
    case 'triangle':
      return <path d="M50 15 L87 81 L13 81 Z" {...strokeProps} />
    case 'diamond':
      return <path d="M50 12 L88 50 L50 88 L12 50 Z" {...strokeProps} />
  }
}