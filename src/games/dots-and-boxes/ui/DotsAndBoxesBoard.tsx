import { motion } from 'motion/react'
import { motionTokens } from '@/presentation/motion/tokens'
import type { DotsBoardViewModel } from '../domain/selectors'
import type { DotsEdge, DotsEdgeOrientation } from '../domain/types'
import { dotsMotion } from '../motion/timings'
import { DOTS_SEAT_META } from './seat-meta'
import { SeatSymbol } from './SeatSymbol'

export interface DotsAndBoxesBoardProps {
  readonly vm: DotsBoardViewModel
  readonly interactive: boolean
  /** 刚画下的边；只有它播放一次「由粗变细、由浅到深」的入场。 */
  readonly freshEdge: DotsEdge | null
  /** 当前 transition 的版本号，作为动画 key，确保每次画线都会重新挂载并播放。 */
  readonly drawVersion: number
  /** 最近一次 transition 中刚被占领的方格索引，用于一次性刷色动画。 */
  readonly freshClaims: ReadonlySet<number>
  readonly onDrawEdge: (edge: DotsEdge) => void
}

const EDGE_HIT_SIZE = 20

/**
 * 点阵棋盘。组件只负责几何呈现与连线点击，
 * 不判断得分或回合；一切归属与合法性都来自上层 Session 快照。
 * 线条不代表玩家，全部使用同一种墨色。
 */
export function DotsAndBoxesBoard({
  vm,
  interactive,
  freshEdge,
  drawVersion,
  freshClaims,
  onDrawEdge,
}: DotsAndBoxesBoardProps) {
  const { boxSize, boxes, horizontalEdges, verticalEdges } = vm
  const percent = (value: number) => `${(value / boxSize) * 100}%`
  const segment = `${100 / boxSize}%`
  const dotSize = `${(0.15 / boxSize) * 100}%`

  function renderEdge(
    orientation: DotsEdgeOrientation,
    row: number,
    col: number,
    drawn: boolean,
  ) {
    const horizontal = orientation === 'horizontal'
    const fresh =
      freshEdge !== null &&
      freshEdge.orientation === orientation &&
      freshEdge.row === row &&
      freshEdge.col === col
    const clickable = interactive && !drawn
    const label = horizontal
      ? `第 ${row + 1} 横排第 ${col + 1} 段`
      : `第 ${col + 1} 竖排第 ${row + 1} 段`
    const lineClass = horizontal
      ? 'top-1/2 right-[3%] left-[3%] h-[3px] -translate-y-1/2'
      : 'top-[3%] bottom-[3%] left-1/2 w-[3px] -translate-x-1/2'

    return (
      <button
        key={`${orientation}-${row}-${col}`}
        type="button"
        disabled={!clickable}
        aria-label={drawn ? `${label}，已画线` : `连接${label}`}
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
        {drawn ? (
          <motion.span
            key={fresh ? `line-${orientation}-${row}-${col}-${drawVersion}` : `line-${orientation}-${row}-${col}`}
            aria-hidden="true"
            className={`absolute rounded-full bg-foreground/70 ${lineClass}`}
            initial={
              fresh
                ? {
                    opacity: 0,
                    scaleX: horizontal ? 1 : 3.6,
                    scaleY: horizontal ? 3.6 : 1,
                  }
                : false
            }
            animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
            transition={dotsMotion.lineDraw}
          />
        ) : clickable ? (
          <span
            aria-hidden="true"
            className={[
              'absolute rounded-full bg-foreground/40 opacity-0 transition-opacity duration-300 ease-out',
              'group-hover:opacity-100 group-focus-visible:opacity-100',
              lineClass,
            ].join(' ')}
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
          if (owner === null) {
            return null
          }
          const fresh = freshClaims.has(index)

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
                style={{ backgroundColor: DOTS_SEAT_META[owner].color, opacity: 0.16 }}
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

        {horizontalEdges.map((drawn, index) =>
          renderEdge('horizontal', Math.floor(index / boxSize), index % boxSize, drawn),
        )}
        {verticalEdges.map((drawn, index) =>
          renderEdge('vertical', Math.floor(index / (boxSize + 1)), index % (boxSize + 1), drawn),
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