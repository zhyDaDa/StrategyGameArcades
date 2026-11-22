import { XIANGQI_COLS, XIANGQI_ROWS } from '../domain/types'
import type {
  XiangqiPiece,
  XiangqiPieceType,
  XiangqiSide,
  XiangqiState,
} from '../domain/types'

export interface PlacedPiece {
  readonly row: number
  readonly col: number
  readonly side: XiangqiSide
  readonly type: XiangqiPieceType
}

/** 测试局面：只放指定棋子，其余为空；默认由红方行动。 */
export function stateFromPieces(
  pieces: readonly PlacedPiece[],
  currentPlayer: XiangqiSide = 'red',
): XiangqiState {
  const cells = Array<XiangqiPiece | null>(XIANGQI_ROWS * XIANGQI_COLS).fill(null)
  for (const { row, col, side, type } of pieces) {
    cells[row * XIANGQI_COLS + col] = { side, type }
  }
  return {
    rows: XIANGQI_ROWS,
    cols: XIANGQI_COLS,
    cells,
    status: 'playing',
    currentPlayer,
    winner: null,
    endReason: null,
    lastMove: null,
    moveCount: 0,
    noCapturePlies: 0,
  }
}

export function hasMove(
  moves: readonly { readonly from: { row: number; col: number }; readonly to: { row: number; col: number } }[],
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