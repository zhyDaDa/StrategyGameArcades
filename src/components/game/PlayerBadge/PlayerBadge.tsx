import type { PlayerSeatSymbol } from '@/presentation/player-seats/player-seats'
import { PlayerSymbol } from '../PlayerSymbol/PlayerSymbol'

export interface PlayerBadgeProps {
  readonly symbol: PlayerSeatSymbol
  readonly color: string
  readonly className?: string
}

/** 带玩家色的符号徽章，配置页与对局面板共用。 */
export function PlayerBadge({ symbol, color, className }: PlayerBadgeProps) {
  return (
    <span
      aria-hidden="true"
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-md border',
        className ?? 'size-8',
      ].join(' ')}
      style={{ backgroundColor: `${color}1f`, borderColor: `${color}59` }}
    >
      <PlayerSymbol symbol={symbol} color={color} className="size-5" />
    </span>
  )
}