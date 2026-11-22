import type { PlayerSeatSymbol } from '@/presentation/player-seats/player-seats'

export interface PlayerSymbolProps {
  readonly symbol: PlayerSeatSymbol
  readonly color: string
  readonly className?: string
}

/** 玩家符号：形状由 symbol 决定，颜色来自调用方。 */
export function PlayerSymbol({ symbol, color, className }: PlayerSymbolProps) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <PlayerSymbolShape symbol={symbol} stroke={color} />
    </svg>
  )
}

export interface PlayerSymbolShapeProps {
  readonly symbol: PlayerSeatSymbol
  readonly stroke: string
  readonly strokeWidth?: number
}

/** 符号几何体（0..100 坐标系），可在外层 SVG 中缩放复用。 */
export function PlayerSymbolShape({ symbol, stroke, strokeWidth = 11 }: PlayerSymbolShapeProps) {
  const strokeProps = {
    fill: 'none',
    stroke,
    strokeWidth,
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