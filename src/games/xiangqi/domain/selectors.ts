import type { GameResult } from '@/core/contracts/result'
import { generateLegalMoves, isInCheck } from './movement'
import type { XiangqiCoord, XiangqiSide, XiangqiState } from './types'

export function selectResult(state: Readonly<XiangqiState>): GameResult | null {
  if (state.status !== 'completed') {
    return null
  }
  return state.winner !== null ? { outcome: 'win', winner: state.winner } : { outcome: 'draw' }
}

export interface XiangqiBoardViewModel {
  readonly rows: number
  readonly cols: number
  readonly cells: XiangqiState['cells']
  readonly lastMove: XiangqiState['lastMove']
  readonly moveCount: number
  readonly legalMoves: readonly { readonly from: XiangqiCoord; readonly to: XiangqiCoord }[]
  readonly inCheckSide: XiangqiSide | null
  readonly interactive: boolean
}

/** State -> 棋盘展示数据：合法着法供选子后高亮，被将军方用于提示。 */
export function selectXiangqiBoardViewModel(state: Readonly<XiangqiState>): XiangqiBoardViewModel {
  const currentPlayer = state.status === 'playing' ? state.currentPlayer : null
  return {
    rows: state.rows,
    cols: state.cols,
    cells: state.cells,
    lastMove: state.lastMove,
    moveCount: state.moveCount,
    legalMoves:
      currentPlayer === null
        ? []
        : generateLegalMoves(state.cells, state.rows, state.cols, currentPlayer),
    inCheckSide:
      currentPlayer !== null && isInCheck(state.cells, state.rows, state.cols, currentPlayer)
        ? currentPlayer
        : null,
    interactive: currentPlayer !== null,
  }
}