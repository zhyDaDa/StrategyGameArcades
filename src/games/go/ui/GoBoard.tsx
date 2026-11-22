import { AnimatePresence, motion } from 'motion/react'
import type { GoBoardViewModel } from '../domain/selectors'
import { GO_BOARD_SIZE, type GoCellValue, type GoSide } from '../domain/types'
import { goMotion } from '../motion/timings'

export interface GoBoardProps {
  readonly vm: GoBoardViewModel
  readonly currentPlayer: GoSide | null
  readonly interactive: boolean
  readonly onPlace: (row: number, col: number) => void
}

/** 19×19 标准星位：4、10、16 线的交点（0 基索引 3、9、15）。 */
const STAR_LINES = [3, 9, 15] as const
const STAR_INDEXES = new Set(
  STAR_LINES.flatMap((row) =>
    STAR_LINES.map((col) => row * GO_BOARD_SIZE + col),
  ),
)

/**
 * 19×19 围棋棋盘。组件只负责坐标点击与呈现，
 * 提子、自杀、劫与胜负全部由上层 Session 快照决定。
 *
 * 棋子放在一层独立覆盖层里，用同一个 AnimatePresence 处理落子弹入与被提子缩放离场,
 * 避免 361 个格子各建一套动画上下文。
 */
export function GoBoard({ vm, currentPlayer, interactive, onPlace }: GoBoardProps) {
  const { size, cells, lastMove, lastCaptured, koPoint, legalPoints } = vm
  const cellPercent = 100 / size
  const legalIndexes = new Set(legalPoints.map(({ row, col }) => row * size + col))

  return (
    <div className="rounded-xl border border-[#a98f63]/60 bg-[#e6d4b3] p-2 shadow-inner ring-1 ring-[#8a7450]/30">
      <div className="relative aspect-square w-full">
        <div
          className="grid h-full w-full"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {cells.map((cell, index) => {
            const row = Math.floor(index / size)
            const col = index % size
            const empty = cell === 'empty'
            const playable = interactive && empty && legalIndexes.has(index)
            const isKo = koPoint !== null && koPoint.row === row && koPoint.col === col
            const isStar = empty && STAR_INDEXES.has(index)

            return (
              <button
                key={`${row}-${col}`}
                type="button"
                aria-label={`第 ${row + 1} 行第 ${col + 1} 列，${cellLabel(cell)}`}
                disabled={!playable}
                onClick={() => onPlace(row, col)}
                className={[
                  'group relative flex aspect-square items-center justify-center',
                  'before:absolute before:top-1/2 before:right-0 before:left-0 before:h-px before:-translate-y-1/2 before:bg-[#b29a72]',
                  'after:absolute after:top-0 after:bottom-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-[#b29a72]',
                  playable ? 'cursor-pointer' : 'cursor-default',
                  'focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                ].join(' ')}
              >
                {isStar ? (
                  <span
                    aria-hidden="true"
                    className="h-[17%] w-[17%] rounded-full bg-[#8a7450]"
                  />
                ) : null}

                {isKo ? (
                  <span
                    aria-hidden="true"
                    className="absolute h-[34%] w-[34%] rounded-[2px] border border-dashed border-primary/80"
                  />
                ) : null}

                {playable && currentPlayer !== null ? (
                  <span
                    aria-hidden="true"
                    className={[
                      'absolute inset-[13%] z-10 rounded-full opacity-0 transition-opacity',
                      'group-hover:opacity-40 group-focus-visible:opacity-40',
                      currentPlayer === 'black'
                        ? 'bg-[#262a25]'
                        : 'bg-[#f7f2e6] ring-1 ring-[#b29a72]',
                    ].join(' ')}
                  />
                ) : null}
              </button>
            )
          })}
        </div>

        <div className="pointer-events-none absolute inset-0 z-20">
          <AnimatePresence initial={false}>
            {cells.map((cell, index) =>
              cell === 'empty' ? null : (
                <motion.div
                  key={index}
                  className="absolute"
                  style={boxStyle(index, size, cellPercent)}
                  initial={{ scale: 0.45, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{
                    scale: 0.25,
                    opacity: 0,
                    transition: {
                      duration: goMotion.capture.duration,
                      ease: goMotion.capture.ease,
                    },
                  }}
                  transition={{
                    duration: goMotion.place.duration,
                    ease: goMotion.place.ease,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className={[
                      'absolute inset-[11%] rounded-full shadow-sm',
                      cell === 'black'
                        ? 'bg-[#262a25]'
                        : 'bg-[#f7f2e6] ring-1 ring-[#b29a72]',
                    ].join(' ')}
                  />
                </motion.div>
              ),
            )}
          </AnimatePresence>

          {lastCaptured.map(({ row, col }) => {
            const index = row * size + col
            return (
              <motion.span
                key={`capture-${lastMove?.row}-${lastMove?.col}-${index}`}
                className="absolute rounded-full border-2 border-primary/70"
                style={boxStyle(index, size, cellPercent)}
                initial={{ scale: 0.7, opacity: 0.75 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: goMotion.capture.duration * 2.4, ease: 'easeOut' }}
              />
            )
          })}

          {lastMove !== null ? (
            <div
              className="absolute flex items-center justify-center"
              style={boxStyle(lastMove.row * size + lastMove.col, size, cellPercent)}
            >
              <span
                aria-hidden="true"
                className="h-[26%] w-[26%] rounded-full bg-primary"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function boxStyle(index: number, size: number, cellPercent: number) {
  const row = Math.floor(index / size)
  const col = index % size
  return {
    left: `${col * cellPercent}%`,
    top: `${row * cellPercent}%`,
    width: `${cellPercent}%`,
    height: `${cellPercent}%`,
  }
}

function cellLabel(cell: GoCellValue): string {
  if (cell === 'black') {
    return '黑子'
  }
  if (cell === 'white') {
    return '白子'
  }
  return '空点'
}