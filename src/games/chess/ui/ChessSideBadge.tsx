import type { ChessSide } from '../domain/types'
import { CHESS_PIECE_ASSETS } from './chess-piece-assets'

export interface ChessSideBadgeProps {
  readonly side: ChessSide
  readonly className?: string
}

/** 配置页的双方徽章：白方白王、黑方黑王，使用与国际象棋棋子一致的 SVG。 */
export function ChessSideBadge({ side, className }: ChessSideBadgeProps) {
  return (
    <span
      aria-hidden="true"
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full border-2 bg-[#f4e4bf] p-1 shadow-sm',
        side === 'white' ? 'border-[#8a7450]' : 'border-[#26231f]',
        className ?? 'size-10',
      ].join(' ')}
    >
      <img
        src={CHESS_PIECE_ASSETS[side].king}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-full w-full select-none object-contain"
      />
    </span>
  )
}