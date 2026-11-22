import type { ChessPieceType, ChessSide } from '../domain/types'
import { CHESS_PIECE_ASSETS } from './chess-piece-assets'

const SQUARE = 12.5
const BOARD = 100
const LIGHT_SQUARE = '#ecdbb9'
const DARK_SQUARE = '#b58a5c'
const ACCENT = '#aa6048'

interface ThumbPiece {
  readonly row: number
  readonly col: number
  readonly side: ChessSide
  readonly type: ChessPieceType
}

const RANKS = Array.from({ length: 8 }, (_, index) => index)
const FILES = Array.from({ length: 8 }, (_, index) => index)

const PIECES: readonly ThumbPiece[] = [
  { row: 0, col: 0, side: 'black', type: 'rook' },
  { row: 0, col: 2, side: 'black', type: 'bishop' },
  { row: 0, col: 3, side: 'black', type: 'queen' },
  { row: 0, col: 5, side: 'black', type: 'rook' },
  { row: 0, col: 6, side: 'black', type: 'king' },
  { row: 1, col: 0, side: 'black', type: 'pawn' },
  { row: 1, col: 1, side: 'black', type: 'pawn' },
  { row: 1, col: 2, side: 'black', type: 'pawn' },
  { row: 1, col: 4, side: 'black', type: 'bishop' },
  { row: 1, col: 5, side: 'black', type: 'pawn' },
  { row: 1, col: 6, side: 'black', type: 'pawn' },
  { row: 1, col: 7, side: 'black', type: 'pawn' },
  { row: 2, col: 2, side: 'black', type: 'knight' },
  { row: 2, col: 3, side: 'black', type: 'pawn' },
  { row: 2, col: 5, side: 'black', type: 'knight' },
  { row: 3, col: 4, side: 'black', type: 'pawn' },
  { row: 4, col: 2, side: 'white', type: 'bishop' },
  { row: 4, col: 4, side: 'white', type: 'pawn' },
  { row: 5, col: 2, side: 'white', type: 'pawn' },
  { row: 5, col: 3, side: 'white', type: 'pawn' },
  { row: 5, col: 5, side: 'white', type: 'knight' },
  { row: 6, col: 0, side: 'white', type: 'pawn' },
  { row: 6, col: 1, side: 'white', type: 'pawn' },
  { row: 6, col: 5, side: 'white', type: 'pawn' },
  { row: 6, col: 6, side: 'white', type: 'pawn' },
  { row: 6, col: 7, side: 'white', type: 'pawn' },
  { row: 7, col: 0, side: 'white', type: 'rook' },
  { row: 7, col: 1, side: 'white', type: 'knight' },
  { row: 7, col: 2, side: 'white', type: 'bishop' },
  { row: 7, col: 3, side: 'white', type: 'queen' },
  { row: 7, col: 5, side: 'white', type: 'rook' },
  { row: 7, col: 6, side: 'white', type: 'king' },
]

const LAST_MOVE = { row: 4, col: 2 }

/** 首页缩略图：静态意大利开局中局，红框标记白方最后一手。 */
export function ChessThumbnail() {
  return (
    <svg
      viewBox={`0 0 ${BOARD} ${BOARD}`}
      className="h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <rect width={BOARD} height={BOARD} fill={LIGHT_SQUARE} />

      {RANKS.map((row) =>
        FILES.map((col) => (
          <rect
            key={`square-${row}-${col}`}
            x={col * SQUARE}
            y={row * SQUARE}
            width={SQUARE}
            height={SQUARE}
            fill={(row + col) % 2 === 0 ? LIGHT_SQUARE : DARK_SQUARE}
          />
        )),
      )}

      {PIECES.map((piece) => (
        <image
          key={`${piece.side}-${piece.type}-${piece.row}-${piece.col}`}
          href={CHESS_PIECE_ASSETS[piece.side][piece.type]}
          x={piece.col * SQUARE}
          y={piece.row * SQUARE}
          width={SQUARE}
          height={SQUARE}
          preserveAspectRatio="xMidYMid meet"
        />
      ))}

      <rect
        x={LAST_MOVE.col * SQUARE + 0.6}
        y={LAST_MOVE.row * SQUARE + 0.6}
        width={SQUARE - 1.2}
        height={SQUARE - 1.2}
        rx="1"
        fill="none"
        stroke={ACCENT}
        strokeWidth="1"
      />

      <rect
        x="0.5"
        y="0.5"
        width={BOARD - 1}
        height={BOARD - 1}
        fill="none"
        stroke="#8a7450"
        strokeWidth="1"
      />
    </svg>
  )
}