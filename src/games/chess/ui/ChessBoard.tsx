import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { pieceAt } from '../domain/movement'
import type { ChessBoardViewModel } from '../domain/selectors'
import {
  CHESS_PROMOTION_TYPES,
  type ChessCoord,
  type ChessPiece,
  type ChessPromotionType,
  type ChessSide,
} from '../domain/types'
import { chessMotion } from '../motion/timings'
import {
  CHESS_PIECE_ASSETS,
  CHESS_PIECE_NAMES,
  chessPieceAsset,
  chessPieceLabel,
} from './chess-piece-assets'

export interface ChessBoardProps {
  readonly vm: ChessBoardViewModel
  readonly currentPlayer: ChessSide | null
  readonly interactive: boolean
  readonly onMove: (
    from: ChessCoord,
    to: ChessCoord,
    promotion?: ChessPromotionType,
  ) => void
}

function gridStyle(coord: ChessCoord, cols: number, rows: number) {
  return {
    left: `${(coord.col / cols) * 100}%`,
    top: `${(coord.row / rows) * 100}%`,
    width: `${100 / cols}%`,
    height: `${100 / rows}%`,
  }
}

function squareName(row: number, col: number): string {
  return `${String.fromCharCode(97 + col)}${8 - row}`
}

/**
 * 8×8 国际象棋棋盘。组件只负责选子、目标格提示、升变选择与棋子呈现，
 * 走法合法性、将军与终局全部来自 Session 快照。
 * 选中的棋子属于本机 UI 状态，随每一次新着法 / 换人 / 失去交互自动清空。
 */
export function ChessBoard({ vm, currentPlayer, interactive, onMove }: ChessBoardProps) {
  const [selection, setSelection] = useState<{
    readonly coord: ChessCoord
    readonly moveCount: number
  } | null>(null)
  const [promotion, setPromotion] = useState<{
    readonly from: ChessCoord
    readonly to: ChessCoord
    readonly moveCount: number
  } | null>(null)
  const { rows, cols, cells, lastMove, legalMoves, checkedKing, moveCount } = vm

  // 选中与升变选择都只在本手局面内有效：局面一变（走子 / 悔棋）或失去交互，旧状态自然失效。
  const selected =
    selection !== null && selection.moveCount === moveCount && interactive
      ? selection.coord
      : null
  const activePromotion =
    promotion !== null && promotion.moveCount === moveCount && interactive
      ? promotion
      : null

  const selectedPiece =
    selected === null ? null : pieceAt(cells, cols, selected.row, selected.col)
  const selectedMoves =
    selected === null || selectedPiece === null || selectedPiece.side !== currentPlayer
      ? []
      : legalMoves.filter(
          (move) => move.from.row === selected.row && move.from.col === selected.col,
        )
  const targets = uniqueTargets(selectedMoves)

  function handleCellClick(row: number, col: number) {
    if (!interactive || currentPlayer === null) {
      return
    }
    const piece = pieceAt(cells, cols, row, col)

    if (selected !== null && selectedPiece !== null && selectedPiece.side === currentPlayer) {
      const moves = selectedMoves.filter((move) => move.to.row === row && move.to.col === col)
      if (moves.length > 0) {
        if (moves.some((move) => move.promotion !== null)) {
          setPromotion({ from: selected, to: { row, col }, moveCount })
          return
        }
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

  function choosePromotion(type: ChessPromotionType) {
    if (activePromotion === null) {
      return
    }
    onMove(activePromotion.from, activePromotion.to, type)
    setPromotion(null)
    setSelection(null)
  }

  const pieces: { readonly index: number; readonly piece: ChessPiece }[] = []
  cells.forEach((piece, index) => {
    if (piece !== null) {
      pieces.push({ index, piece })
    }
  })

  return (
    <MotionConfig reducedMotion="never">
      {/*
       * 棋子落点与吃子反馈是国际象棋的核心玩法反馈：
       * 系统开启「减少动画效果」时，若沿用全局 user 策略，scale 会被直接跳到终值，
       * 落子几乎看不到。这里只在棋盘子树内覆盖，不影响站内其他动画。
       */}
      <div className="rounded-xl border border-[#8a7450]/70 bg-[#8a7450] p-2 shadow-inner ring-1 ring-[#8a7450]/30">
        <div className="relative aspect-square w-full overflow-hidden rounded-md">
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
              const light = (row + col) % 2 === 0
              const own = piece !== null && piece.side === currentPlayer
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  aria-label={`${squareName(row, col)}，${piece === null ? '空格' : chessPieceLabel(piece)}`}
                  disabled={!interactive}
                  onClick={() => handleCellClick(row, col)}
                  className={[
                    'relative flex items-center justify-center',
                    light ? 'bg-[#ecdbb9]' : 'bg-[#b58a5c]',
                    own && interactive ? 'cursor-pointer' : 'cursor-default',
                    'focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  ].join(' ')}
                >
                  {row === rows - 1 ? (
                    <span
                      aria-hidden="true"
                      className={[
                        'pointer-events-none absolute bottom-0.5 right-1 text-[9px] font-medium',
                        light ? 'text-[#7a6242]/70' : 'text-[#f4e4bf]/80',
                      ].join(' ')}
                    >
                      {String.fromCharCode(97 + col)}
                    </span>
                  ) : null}
                  {col === 0 ? (
                    <span
                      aria-hidden="true"
                      className={[
                        'pointer-events-none absolute left-1 top-0.5 text-[9px] font-medium',
                        light ? 'text-[#7a6242]/70' : 'text-[#f4e4bf]/80',
                      ].join(' ')}
                    >
                      {8 - row}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="pointer-events-none absolute inset-0 z-10">
            {lastMove !== null ? (
              <>
                <span
                  aria-hidden="true"
                  className="absolute bg-[#aa6048]/20"
                  style={gridStyle(lastMove.from, cols, rows)}
                />
                <span
                  aria-hidden="true"
                  className="absolute bg-[#aa6048]/20"
                  style={gridStyle(lastMove.to, cols, rows)}
                />
              </>
            ) : null}
            {checkedKing !== null ? (
              <span
                aria-hidden="true"
                className="absolute rounded-sm bg-[radial-gradient(circle_at_center,rgba(166,47,39,0.28),rgba(166,47,39,0.05))] ring-2 ring-inset ring-[#a62f27]/80"
                style={gridStyle(checkedKing, cols, rows)}
              />
            ) : null}
          </div>

          <div className="pointer-events-none absolute inset-0 z-20">
            <AnimatePresence initial={false}>
              {pieces.map(({ index, piece }) => {
                const coord = { row: Math.floor(index / cols), col: index % cols }
                const isLast =
                  lastMove !== null &&
                  lastMove.to.row === coord.row &&
                  lastMove.to.col === coord.col
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
                        duration: chessMotion.capture.duration,
                        ease: chessMotion.capture.ease,
                      },
                    }}
                    transition={{
                      duration: chessMotion.place.duration,
                      ease: chessMotion.place.ease,
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
                  className="absolute inset-[3%] rounded-sm ring-2 ring-[#aa6048]"
                />
              </div>
            ) : null}

            {targets.map(({ to, requiresPromotion }) => {
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
                  ) : requiresPromotion ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-[30%] rotate-45 rounded-[3px] bg-[#aa6048] ring-2 ring-[#f4e4bf]/70"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="absolute inset-[38%] rounded-full bg-[#aa6048]/80"
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
                  duration: chessMotion.capture.duration * 2.2,
                  ease: 'easeOut',
                }}
              />
            ) : null}
          </div>

          {activePromotion !== null && currentPlayer !== null ? (
            <div className="absolute inset-0 z-40 grid place-items-center bg-black/25 p-4">
              <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-4 shadow-xl">
                <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">
                  PROMOTION / 升变
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {CHESS_PROMOTION_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => choosePromotion(type)}
                      className="flex size-14 items-center justify-center rounded-lg border bg-[#ecdbb9] transition-colors hover:bg-[#f4e4bf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title={CHESS_PIECE_NAMES[type]}
                    >
                      <img
                        src={CHESS_PIECE_ASSETS[currentPlayer][type]}
                        alt={CHESS_PIECE_NAMES[type]}
                        className="size-11 select-none"
                        draggable={false}
                      />
                    </button>
                  ))}
                </div>
                <Button variant="ghost" onClick={() => setPromotion(null)}>
                  取消
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </MotionConfig>
  )
}

interface TargetMarker {
  readonly to: ChessCoord
  readonly requiresPromotion: boolean
}

/** 同一目标格可能对应四个升变走法，这里按目标格合并提示。 */
function uniqueTargets(
  moves: readonly { readonly to: ChessCoord; readonly promotion: ChessPromotionType | null }[],
): readonly TargetMarker[] {
  const targets = new Map<string, TargetMarker>()
  for (const move of moves) {
    const key = `${move.to.row}-${move.to.col}`
    const existing = targets.get(key)
    targets.set(key, {
      to: move.to,
      requiresPromotion: (existing?.requiresPromotion ?? false) || move.promotion !== null,
    })
  }
  return [...targets.values()]
}

function PieceToken({
  piece,
  highlighted,
}: {
  readonly piece: ChessPiece
  readonly highlighted: boolean
}) {
  return (
    <div className="absolute inset-[5%]">
      <img
        src={chessPieceAsset(piece)}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-full w-full select-none object-contain drop-shadow-[0_1px_1px_rgba(58,43,20,0.4)]"
      />
      {highlighted ? (
        <span
          aria-hidden="true"
          className="absolute inset-[2%] rounded-sm ring-2 ring-[#aa6048]/85"
        />
      ) : null}
    </div>
  )
}