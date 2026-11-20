import type { DotsAndBoxesSeat } from '../domain/types'
import { DOTS_SEAT_META } from './seat-meta'
import { SeatSymbol } from './SeatSymbol'

export interface SeatBadgeProps {
  readonly seat: DotsAndBoxesSeat
  readonly className?: string
}

/** 带玩家色的符号徽章，配置页与对局面板共用。 */
export function SeatBadge({ seat, className }: SeatBadgeProps) {
  const { color } = DOTS_SEAT_META[seat]
  return (
    <span
      aria-hidden="true"
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-md border',
        className ?? 'size-8',
      ].join(' ')}
      style={{ backgroundColor: `${color}1f`, borderColor: `${color}59` }}
    >
      <SeatSymbol seat={seat} className="size-5" />
    </span>
  )
}