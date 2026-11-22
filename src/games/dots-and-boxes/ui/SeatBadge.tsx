import { PlayerBadge } from '@/components/game/PlayerBadge/PlayerBadge'
import type { DotsAndBoxesSeat } from '../domain/types'
import { DOTS_SEAT_META } from './seat-meta'

export interface SeatBadgeProps {
  readonly seat: DotsAndBoxesSeat
  readonly className?: string
}

/** 带玩家色的符号徽章，配置页与对局面板共用。 */
export function SeatBadge({ seat, className }: SeatBadgeProps) {
  const { color, symbol } = DOTS_SEAT_META[seat]
  return <PlayerBadge symbol={symbol} color={color} className={className} />
}