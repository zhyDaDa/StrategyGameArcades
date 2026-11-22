import type { XiangqiSide } from '../domain/types'
import {
  XIANGQI_PIECE_FONT_CLASS,
  XIANGQI_SIDE_GLYPH,
  XIANGQI_SIDE_TEXT_CLASS,
} from './xiangqi-piece-labels'

export interface XiangqiSideBadgeProps {
  readonly side: XiangqiSide
  readonly className?: string
}

/** 配置页的双方徽章：红方“帅”、黑方“将”，用棋子同款传统字体。 */
export function XiangqiSideBadge({ side, className }: XiangqiSideBadgeProps) {
  return (
    <span
      aria-hidden="true"
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full border-2 bg-[#f4e4bf] shadow-sm',
        side === 'red' ? 'border-[#a62f27]' : 'border-[#26231f]',
        className ?? 'size-10',
      ].join(' ')}
    >
      <span
        className={[
          XIANGQI_PIECE_FONT_CLASS,
          XIANGQI_SIDE_TEXT_CLASS[side],
          'text-[1.35em] leading-none',
        ].join(' ')}
      >
        {XIANGQI_SIDE_GLYPH[side]}
      </span>
    </span>
  )
}