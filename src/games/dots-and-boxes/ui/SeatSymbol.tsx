import { PlayerSymbol } from '@/components/game/PlayerSymbol/PlayerSymbol'
import type { DotsAndBoxesSeat } from '../domain/types'
import { DOTS_SEAT_META } from './seat-meta'

export interface SeatSymbolProps {
  readonly seat: DotsAndBoxesSeat
  readonly className?: string
}

/** 席位符号：颜色来自 DOTS_SEAT_META，形状由符号类型决定。 */
export function SeatSymbol({ seat, className }: SeatSymbolProps) {
  const { color, symbol } = DOTS_SEAT_META[seat]
  return <PlayerSymbol symbol={symbol} color={color} className={className} />
}

export { PlayerSymbolShape as SeatSymbolShape } from '@/components/game/PlayerSymbol/PlayerSymbol'
export type { PlayerSymbolShapeProps as SeatSymbolShapeProps } from '@/components/game/PlayerSymbol/PlayerSymbol'