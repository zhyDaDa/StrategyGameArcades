import type { GomokuBoardViewModel } from '../domain/selectors'
import type { GomokuSide } from '../domain/types'

export interface GomokuBoardProps {
  readonly vm: GomokuBoardViewModel
  readonly currentPlayer: GomokuSide | null
  readonly interactive: boolean
  readonly onPlace: (row: number, col: number) => void
}

/**
 * 15×15 棋盘。组件只负责坐标点击与呈现，
 * 不判断胜负、不改棋盘；合法性与状态全部来自上层的 Session 快照。
 */
export function GomokuBoard({ vm, currentPlayer, interactive, onPlace }: GomokuBoardProps) {
  const { size, cells, lastMove, winningLine } = vm
  const winningCells = new Set(winningLine.map((point) => point.row * size + point.col))

  return (
    <div className="rounded-xl border bg-card p-3 ring-1 ring-foreground/10">
      <div className="grid aspect-square w-full grid-cols-[repeat(15,minmax(0,1fr))]">
        {cells.map((cell, index) => {
          const row = Math.floor(index / size)
          const col = index % size
          const empty = cell === 'empty'
          const isLast = lastMove !== null && lastMove.row === row && lastMove.col === col
          const isWinning = winningCells.has(index)
          const ghostSide = currentPlayer

          return (
            <button
              key={`${row}-${col}`}
              type="button"
              aria-label={`第 ${row + 1} 行第 ${col + 1} 列，${cell === 'empty' ? '空位' : cell === 'black' ? '黑子' : '白子'}`}
              disabled={!interactive || !empty}
              onClick={() => onPlace(row, col)}
              className={[
                'group relative flex aspect-square items-center justify-center',
                'before:absolute before:top-1/2 before:right-0 before:left-0 before:h-px before:-translate-y-1/2 before:bg-border',
                'after:absolute after:top-0 after:bottom-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border',
                interactive && empty ? 'cursor-pointer' : 'cursor-default',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              ].join(' ')}
            >
              {empty && interactive && ghostSide !== null ? (
                <span
                  aria-hidden="true"
                  className={[
                    'absolute z-10 h-[76%] w-[76%] rounded-full opacity-0 transition-opacity',
                    'group-hover:opacity-40 group-focus-visible:opacity-40',
                    ghostSide === 'black' ? 'bg-zinc-900' : 'bg-zinc-50 ring-1 ring-border',
                  ].join(' ')}
                />
              ) : null}

              {empty ? null : (
                <span
                  aria-hidden="true"
                  className={[
                    'absolute z-10 h-[76%] w-[76%] rounded-full shadow-sm',
                    cell === 'black' ? 'bg-zinc-900' : 'bg-zinc-50 ring-1 ring-zinc-300',
                    isWinning ? 'ring-2 ring-primary ring-offset-2' : '',
                  ].join(' ')}
                />
              )}

              {isLast ? (
                <span
                  aria-hidden="true"
                  className="absolute top-[12%] right-[12%] z-20 h-1.5 w-1.5 rounded-full bg-primary"
                />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}