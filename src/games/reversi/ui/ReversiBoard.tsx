import { AnimatePresence, motion } from 'motion/react'
import type { ReversiBoardViewModel } from '../domain/selectors'
import type { ReversiSide } from '../domain/types'
import { reversiMotion } from '../motion/timings'

export interface ReversiBoardProps {
  readonly vm: ReversiBoardViewModel
  readonly currentPlayer: ReversiSide | null
  readonly interactive: boolean
  readonly onPlace: (row: number, col: number) => void
}

/**
 * 8×8 黑白棋棋盘。组件只负责坐标点击、落子提示与翻面呈现，
 * 不判断夹击或胜负；合法位置与棋子颜色全部来自 Session 快照。
 */
export function ReversiBoard({ vm, currentPlayer, interactive, onPlace }: ReversiBoardProps) {
  const { size, cells, lastMove, legalMoves } = vm
  const legalIndexes = new Set(legalMoves.map(({ row, col }) => row * size + col))

  return (
    <div className="rounded-xl border bg-card p-3 ring-1 ring-foreground/10">
      <div className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-md bg-emerald-800 p-1 shadow-inner ring-1 ring-emerald-950/50">
        {cells.map((cell, index) => {
          const row = Math.floor(index / size)
          const col = index % size
          const empty = cell === 'empty'
          const playable = interactive && empty && legalIndexes.has(index)
          const isLast = lastMove !== null && lastMove.row === row && lastMove.col === col

          return (
            <button
              key={`${row}-${col}`}
              type="button"
              aria-label={`第 ${row + 1} 行第 ${col + 1} 列，${cellLabel(cell)}`}
              disabled={!playable}
              onClick={() => onPlace(row, col)}
              className={[
                'group relative flex aspect-square items-center justify-center border border-emerald-950/45',
                playable ? 'cursor-pointer' : 'cursor-default',
                'focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
              ].join(' ')}
            >
              {playable && currentPlayer !== null ? (
                <span
                  aria-hidden="true"
                  className={[
                    'absolute inset-[36%] rounded-full opacity-40 transition-opacity group-hover:inset-[12%] group-hover:opacity-80',
                    currentPlayer === 'black' ? 'bg-zinc-900' : 'bg-zinc-50',
                  ].join(' ')}
                />
              ) : null}

              <AnimatePresence initial>
                {empty ? null : (
                  <Disc key="disc" side={cell} />
                )}
              </AnimatePresence>

              {isLast ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-20 rounded-sm ring-2 ring-amber-300/80"
                />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function cellLabel(cell: ReversiBoardViewModel['cells'][number]): string {
  if (cell === 'black') {
    return '黑子'
  }
  if (cell === 'white') {
    return '白子'
  }
  return '空位'
}

/**
 * 单枚棋子。正反两面分别绘制黑白，用 rotateY 表达真实翻面；
 * 新落子会从略小处弹入，被夹击翻转时则连续转到另一面。
 */
function Disc({ side }: { readonly side: ReversiSide }) {
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute inset-[8%] z-10 [transform-style:preserve-3d]"
      initial={{ opacity: 0, scale: 0.35, rotateY: 0 }}
      animate={{ opacity: 1, scale: 1, rotateY: side === 'white' ? 180 : 0 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{
        opacity: reversiMotion.place,
        scale: reversiMotion.place,
        rotateY: reversiMotion.flip,
      }}
    >
      <span className="absolute inset-0 rounded-full bg-zinc-900 shadow-sm [backface-visibility:hidden]" />
      <span className="absolute inset-0 rounded-full bg-zinc-50 shadow-sm ring-1 ring-zinc-300 [backface-visibility:hidden] [transform:rotateY(180deg)]" />
    </motion.span>
  )
}