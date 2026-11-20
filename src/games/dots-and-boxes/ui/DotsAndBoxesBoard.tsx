import { motion } from 'motion/react'
import { motionTokens } from '@/presentation/motion/tokens'
import type { DotsBoardViewModel } from '../domain/selectors'
import type {
  DotsAndBoxesSeat,
  DotsEdge,
  DotsEdgeOrientation,
} from '../domain/types'
import { DOTS_SEAT_META, seatColor } from './seat-meta'
import { SeatSymbol } from './SeatSymbol'

export interface DotsAndBoxesBoardProps {
  readonly vm: DotsBoardViewModel
  readonly currentPlayer: DotsAndBoxesSeat | null
  readonly interactive: boolean
  /** 最近一次 transition 中刚被占领的方格索引，用于一次性刷色动画。 */
  readonly freshClaims: ReadonlySet<number>
  readonly onDrawEdge: (edge: DotsEdge) => void
}

const EDGE_HIT_SIZE = 20

/**
 * 点阵棋盘。组件只负责几何呈现与连线点击，
 * 不判断得分或回合；一切归属与合法性都来自上层 Session 快照。
 * 坐标以「方格」为单位：第 r 行第 c 列方格的左上角就在 (c, r)。
 */
export function DotsAndBoxesBoard({
  vm,
  currentPlayer,
  interactive,
  freshClaims,
  onDrawEdge,
}: DotsAndBoxesBoardProps) {
  const { boxSize, boxes, horizontalEdges, verticalEdges, lastEdge } = vm
  const percent = (value: number) => `${(value / boxSize) * 100}%`
  const segment = `${100 / boxSize}%`
  const dotSize = `${(0.15 / boxSize) * 100}%`
  const hintColor = currentPlayer === null ? 'transparent' : seatColor(currentPlayer)

  function renderEdge(
    orientation: DotsEdgeOrientation,
    row: number,
    col: number,
    owner: DotsAndBoxesSeat | null,
  ) {
    const horizontal = orientation === 'horizontal'
    const isLast =
      lastEdge !== null &&
      lastEdge.orientation === orientation &&
      lastEdge.row === row &&
      lastEdge.col === col
    const clickable = interactive && owner === null
    const label = horizontal
      ? `第 ${row + 1} 横排第 ${col + 1} 段`
      : `第 ${col + 1} 竖排第 ${row + 1} 段`

    return (
      <button
        key={`${orientation}-${row}-${col}`}
        type="button"
        disabled={!clickable}
        aria-label={
          owner === null ? `连接${label}` : `${label}，已由${DOTS_SEAT_META[owner].label}连接`
        }
        onClick={() => onDrawEdge({ orientation, row, col })}
        className={[
          'group absolute z-10 -translate-x-1/2 -translate-y-1/2',
          clickable ? 'cursor-pointer' : 'cursor-default',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        ].join(' ')}
        style={
          horizontal
            ? {
                left: percent(col + 0.5),
                top: percent(row),
                width: segment,
                height: `${EDGE_HIT_SIZE}px`,
              }
            : {
                left: percent(col),
                top: percent(row + 0.5),
                width: `${EDGE_HIT_SIZE}px`,
                height: segment,
              }
        }
      >
        {owner !== null ? (
          <span
            aria-hidden="true"
            className={[
              'absolute rounded-full',
              horizontal
                ? `top-1/2 right-[3%] left-[3%] -translate-y-1/2 ${isLast ? 'h-[4px]' : 'h-[3px]'}`
                : `top-[3%] bottom-[3%] left-1/2 -translate-x-1/2 ${isLast ? 'w-[4px]' : 'w-[3px]'}`,
            ].join(' ')}
            style={{ backgroundColor: seatColor(owner) }}
          />
        ) : clickable ? (
          <span
            aria-hidden="true"
            className={[
              'absolute rounded-full opacity-0 transition-opacity duration-150',
              'group-hover:opacity-40 group-focus-visible:opacity-50',
              horizontal ? 'top-1/2 right-[3%] left-[3%] h-[3px] -translate-y-1/2' : 'left-1/2 top-[3%] bottom-[3%] w-[3px] -translate-x-1/2',
            ].join(' ')}
            style={{ backgroundColor: hintColor }}
          />
        ) : null}
      </button>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-3 ring-1 ring-foreground/10">
      <div className="relative aspect-square w-full">
        {boxes.map((owner, index) => {
          const row = Math.floor(index / boxSize)
          const col = index % boxSize
          const fresh = freshClaims.has(index)
          if (owner === null) {
            return null
          }

          return (
            <div
              key={`box-${row}-${col}`}
              aria-label={`第 ${row + 1} 行第 ${col + 1} 列，${DOTS_SEAT_META[owner].label}`}
              className="absolute z-0"
              style={{
                left: percent(col),
                top: percent(row),
                width: segment,
                height: segment,
              }}
            >
              <motion.div
                aria-hidden="true"
                className="absolute inset-[7%] rounded-[3px]"
                style={{ backgroundColor: seatColor(owner), opacity: 0.16 }}
                initial={fresh ? { clipPath: 'inset(100% 0% 0% 100%)' } : false}
                animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
                transition={{
                  duration: motionTokens.duration.deliberate,
                  ease: motionTokens.ease.out,
                }}
              />
              <motion.div
                aria-hidden="true"
                className="absolute inset-[30%]"
                initial={fresh ? { opacity: 0, scale: 1.9 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: motionTokens.duration.deliberate,
                  ease: motionTokens.ease.out,
                  delay: fresh ? motionTokens.duration.quick : 0,
                }}
              >
                <SeatSymbol seat={owner} className="h-full w-full" />
              </motion.div>
            </div>
          )
        })}

        {horizontalEdges.map((owner, index) =>
          renderEdge('horizontal', Math.floor(index / boxSize), index % boxSize, owner),
        )}
        {verticalEdges.map((owner, index) =>
          renderEdge('vertical', Math.floor(index / (boxSize + 1)), index % (boxSize + 1), owner),
        )}

        {Array.from({ length: (boxSize + 1) * (boxSize + 1) }, (_, index) => {
          const row = Math.floor(index / (boxSize + 1))
          const col = index % (boxSize + 1)
          return (
            <span
              key={`dot-${row}-${col}`}
              aria-hidden="true"
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/45"
              style={{
                left: percent(col),
                top: percent(row),
                width: dotSize,
                height: dotSize,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}