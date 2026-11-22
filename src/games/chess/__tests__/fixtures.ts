import { CHESS_COLS, CHESS_ROWS } from '../domain/types'
import type {
  ChessCastlingBySide,
  ChessCoord,
  ChessPiece,
  ChessPieceType,
  ChessSide,
  ChessState,
} from '../domain/types'

export interface PlacedPiece {
  readonly row: number
  readonly col: number
  readonly side: ChessSide
  readonly type: ChessPieceType
}

export interface FixtureOptions {
  readonly currentPlayer?: ChessSide
  readonly castling?: ChessCastlingBySide
  readonly enPassantTarget?: ChessCoord | null
  readonly halfmoveClock?: number
}

export const NO_CASTLING: ChessCastlingBySide = {
  white: { kingSide: false, queenSide: false },
  black: { kingSide: false, queenSide: false },
}

export function whiteKingSideOnly(): ChessCastlingBySide {
  return {
    white: { kingSide: true, queenSide: false },
    black: { kingSide: false, queenSide: false },
  }
}

/** 测试局面：只放指定棋子，其余为空；默认由白方行动且双方均无易位权利。 */
export function stateFromPieces(
  pieces: readonly PlacedPiece[],
  options: FixtureOptions = {},
): ChessState {
  const cells = Array<ChessPiece | null>(CHESS_ROWS * CHESS_COLS).fill(null)
  for (const { row, col, side, type } of pieces) {
    cells[row * CHESS_COLS + col] = { side, type }
  }
  return {
    rows: CHESS_ROWS,
    cols: CHESS_COLS,
    cells,
    castling: options.castling ?? NO_CASTLING,
    enPassantTarget: options.enPassantTarget ?? null,
    status: 'playing',
    currentPlayer: options.currentPlayer ?? 'white',
    winner: null,
    endReason: null,
    lastMove: null,
    moveCount: 0,
    halfmoveClock: options.halfmoveClock ?? 0,
  }
}

export function hasMove(
  moves: readonly {
    readonly from: { readonly row: number; readonly col: number }
    readonly to: { readonly row: number; readonly col: number }
  }[],
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
): boolean {
  return moves.some(
    (move) =>
      move.from.row === fromRow &&
      move.from.col === fromCol &&
      move.to.row === toRow &&
      move.to.col === toCol,
  )
}