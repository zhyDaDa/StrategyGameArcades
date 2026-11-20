import type { GameResult } from '@/core/contracts/result'
import { countWinner, getLegalMoves } from './rules'
import type { ReversiCoord, ReversiSide, ReversiState } from './types'

export function selectResult(state: Readonly<ReversiState>): GameResult | null {
  if (state.status !== 'completed') {
    return null
  }
  return state.winner !== null
    ? { outcome: 'win', winner: state.winner }
    : { outcome: 'draw' }
}

export function selectDiscCounts(state: Readonly<ReversiState>): { readonly black: number; readonly white: number } {
  let black = 0
  let white = 0
  for (const cell of state.cells) {
    if (cell === 'black') {
      black += 1
    } else if (cell === 'white') {
      white += 1
    }
  }
  return { black, white }
}

export interface ReversiBoardViewModel {
  readonly size: number
  readonly cells: ReversiState['cells']
  readonly lastMove: ReversiState['lastMove']
  readonly legalMoves: readonly ReversiCoord[]
  readonly interactive: boolean
}

/** State -> 棋盘展示数据（含可落子位置提示）。 */
export function selectReversiBoardViewModel(state: Readonly<ReversiState>): ReversiBoardViewModel {
  const currentPlayer: ReversiSide | null = state.status === 'playing' ? state.currentPlayer : null
  return {
    size: state.size,
    cells: state.cells,
    lastMove: state.lastMove,
    legalMoves: currentPlayer !== null ? getLegalMoves(state.cells, state.size, currentPlayer) : [],
    interactive: state.status === 'playing',
  }
}