import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import type { XiangqiBoardViewModel } from '../domain/selectors'
import { pieceAt } from '../domain/movement'
import type { XiangqiCoord, XiangqiPiece, XiangqiSide } from '../domain/types'
import { xiangqiMotion } from '../motion/timings'
import { pieceLabel } from './xiangqi-piece-labels'

export interface XiangqiBoardProps {
  readonly vm: XiangqiBoardViewModel
  readonly currentPlayer: XiangqiSide | null
  readonly interactive: boolean
  readonly onMove: (from: XiangqiCoord, to: XiangqiCoord) => void
}

const PIECE_FONT =
  'KaiTi, STKaiti, Kaiti SC, Songti SC, STSong, SimSun, Noto Serif CJK SC, serif'
const RED = '#a62f27'
const BLACK = '#26231f'

const COLUMNS = Array.from({ length: 9 }, (_, index) => index)
const ROWS = Array.from({ length: 10 }, (_, index) => index)

/** 炮位与兵位的传统定位角标。 */
const MARK_POINTS: readonly XiangqiCoord[] = [
  { row: 2, col: 1 },
  { row: 2, col: 7 },
  { row: 3, col: 0 },
  { row: 3, col: 2 },
  { row: 3, col: 4 },
  { row: 3, col: 6 },
  { row: 3, col: 8 },
  { row: 6, col: 0 },
  { row: 6, col: 2 },
  { row: 6, col: 4 },
  { row: 6, col: 6 },
  { row: 6, col: 8 },
  { row: 7, col: 1 },
  { row: 7, col: 7 },
]

function gridStyle(coord: XiangqiCoord, cols: number, rows: number) {
  return {
    left: `${(coord.col / cols) * 100}%`,
    top: `${(coord.row / rows) * 100}%`,
    width: `${100 / cols}%`,
    height: `${100 / rows}%`,
  }
}

/**
 * 9×10 中国象棋棋盘。组件只负责选子、目标点提示与棋子呈现，
 * 走法合法性、将军与终局全部来自 Session 快照。
 * 选中的棋子属于本机 UI 状态，随每一次新着法 / 换人 / 失去交互自动清空。
 */
export function XiangqiBoard({ vm, currentPlayer, interactive, onMove }: XiangqiBoardProps) {
  const [selection, setSelection] = useState<{
    readonly coord: XiangqiCoord
    readonly moveCount: number
  } | null>(null)
  const { rows, cols, cells, lastMove, legalMoves, moveCount } = vm

  // 选中只在本手局面内有效：局面一变（走子 / 悔棋）或失去交互，旧选择自然失效。
  const selected =
    selection !== null && selection.moveCount === moveCount && interactive
      ? selection.coord
      : null

  const selectedPiece =
    selected === null ? null : pieceAt(cells, cols, selected.row, selected.col)
  const targets =
    selected === null || selectedPiece === null || selectedPiece.side !== currentPlayer
      ? []
      : legalMoves.filter(
          (move) => move.from.row === selected.row && move.from.col === selected.col,
        )

  function handleCellClick(row: number, col: number) {
    if (!interactive || currentPlayer === null) {
      return
    }
    const piece = pieceAt(cells, cols, row, col)

    if (selected !== null && selectedPiece !== null && selectedPiece.side === currentPlayer) {
      const isTarget = targets.some((move) => move.to.row === row && move.to.col === col)
      if (isTarget) {
        onMove(selected, { row, col })
        setSelection(null)
        return
      }
    }

    if (piece !== null && piece.side === currentPlayer) {
      setSelection({ coord: { row, col }, moveCount })
      return
    }
    setSelection(null)
  }

  const pieces: { readonly index: number; readonly piece: XiangqiPiece }[] = []
  cells.forEach((piece, index) => {
    if (piece !== null) {
      pieces.push({ index, piece })
    }
  })

  return (
    <div className="rounded-xl border border-[#a98f63]/70 bg-[#e6d4b3] p-2 shadow-inner ring-1 ring-[#8a7450]/30">
      <div className="relative aspect-9/10 w-full">
        <BoardLines />

        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {cells.map((piece, index) => {
            const row = Math.floor(index / cols)
            const col = index % cols
            const own = piece !== null && piece.side === currentPlayer
            const selectable = interactive && own
            return (
              <button
                key={`${row}-${col}`}
                type="button"
                aria-label={`第 ${row + 1} 行第 ${col + 1} 列，${piece === null ? '空位' : `${sideLabel(piece.side)}${pieceLabel(piece)}`}`}
                disabled={!interactive}
                onClick={() => handleCellClick(row, col)}
                className={[
                  'relative flex items-center justify-center',
                  selectable ? 'cursor-pointer' : 'cursor-default',
                  'focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selectable ? 'hover:bg-[#0000000c]' : '',
                ].join(' ')}
              />
            )
          })}
        </div>

        <div className="pointer-events-none absolute inset-0 z-20">
          <AnimatePresence initial={false}>
            {pieces.map(({ index, piece }) => {
              const coord = { row: Math.floor(index / cols), col: index % cols }
              const isLast =
                lastMove !== null && lastMove.to.row === coord.row && lastMove.to.col === coord.col
              return (
                <motion.div
                  key={`${index}-${piece.side}-${piece.type}`}
                  className="absolute"
                  style={gridStyle(coord, cols, rows)}
                  initial={{ scale: 0.55, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{
                    scale: 0.4,
                    opacity: 0,
                    transition: {
                      duration: xiangqiMotion.capture.duration,
                      ease: xiangqiMotion.capture.ease,
                    },
                  }}
                  transition={{
                    duration: xiangqiMotion.place.duration,
                    ease: xiangqiMotion.place.ease,
                  }}
                >
                  <PieceToken piece={piece} highlighted={isLast} />
                </motion.div>
              )
            })}
          </AnimatePresence>

          {selected !== null && selectedPiece !== null && selectedPiece.side === currentPlayer ? (
            <div
              className="absolute flex items-center justify-center"
              style={gridStyle(selected, cols, rows)}
            >
              <span
                aria-hidden="true"
                className="absolute inset-[4%] rounded-full ring-2 ring-[#aa6048] ring-offset-1 ring-offset-[#e6d4b3]"
              />
            </div>
          ) : null}

          {targets.map(({ to }) => {
            const occupied = pieceAt(cells, cols, to.row, to.col) !== null
            return (
              <div
                key={`target-${to.row}-${to.col}`}
                className="absolute flex items-center justify-center"
                style={gridStyle(to, cols, rows)}
              >
                {occupied ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-[3%] rounded-full border-2 border-dashed border-[#aa6048]/85"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="h-[22%] w-[22%] rounded-full bg-[#aa6048]/75"
                  />
                )}
              </div>
            )
          })}

          {lastMove !== null && lastMove.captured !== null ? (
            <motion.span
              key={`capture-${moveCount}`}
              className="absolute rounded-full border-2 border-[#aa6048]/80"
              style={gridStyle(lastMove.to, cols, rows)}
              initial={{ scale: 0.65, opacity: 0.8 }}
              animate={{ scale: 1.45, opacity: 0 }}
              transition={{
                duration: xiangqiMotion.capture.duration * 2.2,
                ease: 'easeOut',
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** 棋盘线、九宫斜线与炮/兵定位角标。坐标单位与网格单元一致，交点位于格心。 */
function BoardLines() {
  return (
    <svg
      viewBox="0 0 9 10"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="0.5" y="0.5" width="8" height="9" fill="none" stroke="#7d653d" strokeWidth="0.055" />
      <rect x="0.28" y="0.28" width="8.44" height="9.44" fill="none" stroke="#9c8253" strokeWidth="0.03" />

      <g stroke="#9c8253" strokeWidth="0.028">
        {COLUMNS.map((col) => {
          const left = col + 0.5
          if (col === 0 || col === 8) {
            return <line key={`v-${col}`} x1={left} y1="0.5" x2={left} y2="9.5" />
          }
          return (
            <g key={`v-${col}`}>
              <line x1={left} y1="0.5" x2={left} y2="4.5" />
              <line x1={left} y1="5.5" x2={left} y2="9.5" />
            </g>
          )
        })}
        {ROWS.map((row) => {
          const top = row + 0.5
          return <line key={`h-${row}`} x1="0.5" y1={top} x2="8.5" y2={top} />
        })}
        <line x1="3.5" y1="0.5" x2="5.5" y2="2.5" />
        <line x1="5.5" y1="0.5" x2="3.5" y2="2.5" />
        <line x1="3.5" y1="7.5" x2="5.5" y2="9.5" />
        <line x1="5.5" y1="7.5" x2="3.5" y2="9.5" />
      </g>

      {MARK_POINTS.map(({ row, col }) => (
        <PositionMark key={`mark-${row}-${col}`} coord={{ row, col }} />
      ))}

      <g fill="#8a7450" fontFamily={PIECE_FONT} fontSize="0.46" textAnchor="middle">
        <text x="2.2" y="5.16" letterSpacing="0.14">楚河</text>
        <text x="6.8" y="5.16" letterSpacing="0.14">汉界</text>
      </g>
    </svg>
  )
}

function PositionMark({ coord }: { readonly coord: XiangqiCoord }) {
  const centerX = coord.col + 0.5
  const centerY = coord.row + 0.5
  const gap = 0.16
  const length = 0.11
  const segments: { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }[] = []

  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const px = centerX + sx * gap
      const py = centerY + sy * gap
      if (coord.col === 0 && sx < 0) continue
      if (coord.col === 8 && sx > 0) continue
      segments.push({ x1: px, y1: py, x2: px - sx * length, y2: py })
      segments.push({ x1: px, y1: py, x2: px, y2: py - sy * length })
    }
  }

  return (
    <g stroke="#9c8253" strokeWidth="0.03">
      {segments.map((segment, index) => (
        <line
          key={index}
          x1={segment.x1}
          y1={segment.y1}
          x2={segment.x2}
          y2={segment.y2}
        />
      ))}
    </g>
  )
}

function PieceToken({
  piece,
  highlighted,
}: {
  readonly piece: XiangqiPiece
  readonly highlighted: boolean
}) {
  const color = piece.side === 'red' ? RED : BLACK
  return (
    <div className="absolute inset-[8%]">
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full drop-shadow-[0_1px_1px_rgba(58,43,20,0.35)]"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="50" cy="50" r="46" fill="#f4e4bf" stroke={color} strokeWidth="4" />
        <circle
          cx="50"
          cy="50"
          r="39"
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          opacity="0.5"
        />
        <text
          x="50"
          y="53"
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize="57"
          fontWeight="600"
          fontFamily={PIECE_FONT}
        >
          {pieceLabel(piece)}
        </text>
      </svg>
      {highlighted ? (
        <span
          aria-hidden="true"
          className="absolute inset-[3%] rounded-full ring-2 ring-[#aa6048]/85"
        />
      ) : null}
    </div>
  )
}

function sideLabel(side: XiangqiSide): string {
  return side === 'red' ? '红方' : '黑方'
}