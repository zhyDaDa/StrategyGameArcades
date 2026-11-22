import type { GameResult } from '@/core/contracts/result'
import { findKing, generateLegalMoves, isInCheck, type ChessMove } from './movement'
import type { ChessCoord, ChessSide, ChessState } from './types'

export function selectResult(state: Readonly<ChessState>): GameResult | null {
  if (state.status !== 'completed') {
    return null
  }
  return state.winner !== null ? { outcome: 'win', winner: state.winner } : { outcome: 'draw' }
}

export interface ChessBoardViewModel {
  readonly rows: number
  readonly cols: number
  readonly cells: ChessState['cells']
  readonly lastMove: ChessState['lastMove']
  readonly moveCount: number
  readonly legalMoves: readonly ChessMove[]
  readonly inCheckSide: ChessSide | null
  readonly checkedKing: ChessCoord | null
  readonly interactive: boolean
}

/** State -> 棋盘展示数据：合法着法供选子后高亮，被将军方的王用于提示。 */
export function selectChessBoardViewModel(state: Readonly<ChessState>): ChessBoardViewModel {
  const currentPlayer = state.status === 'playing' ? state.currentPlayer : null
  const inCheck =
    currentPlayer !== null && isInCheck(state, currentPlayer) ? currentPlayer : null

  return {
    rows: state.rows,
    cols: state.cols,
    cells: state.cells,
    lastMove: state.lastMove,
    moveCount: state.moveCount,
    legalMoves: currentPlayer === null ? [] : generateLegalMoves(state, currentPlayer),
    inCheckSide: inCheck,
    checkedKing:
      inCheck === null ? null : findKing(state.cells, state.cols, inCheck),
    interactive: currentPlayer !== null,
  }
}