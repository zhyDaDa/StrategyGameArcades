import type { GameResult } from '@/core/contracts/result'
import { findWinningLine } from './rules'
import type { GomokuCellValue, GomokuCoord, GomokuEndReason, GomokuState } from './types'

export function selectResult(state: Readonly<GomokuState>): GameResult | null {
  if (state.status !== 'completed') {
    return null
  }
  return state.winner !== null
    ? { outcome: 'win', winner: state.winner }
    : { outcome: 'draw' }
}

export function selectEndReason(state: Readonly<GomokuState>): GomokuEndReason | null {
  return state.endReason
}

export function selectWinningLine(state: Readonly<GomokuState>): readonly GomokuCoord[] {
  // 认输时最后一步属于认输方，不能拿赢家去扫描，否则可能误判出假连线。
  if (state.endReason !== 'five' || state.lastMove === null || state.winner === null) {
    return []
  }
  return findWinningLine(state.cells, state.size, state.lastMove, state.winner) ?? []
}

export interface GomokuBoardViewModel {
  readonly size: number
  readonly cells: readonly GomokuCellValue[]
  readonly lastMove: GomokuCoord | null
  readonly winningLine: readonly GomokuCoord[]
  readonly interactive: boolean
}

/** State -> 棋盘展示数据（纯函数，不修改输入）。 */
export function selectGomokuBoardViewModel(state: Readonly<GomokuState>): GomokuBoardViewModel {
  return {
    size: state.size,
    cells: state.cells,
    lastMove: state.lastMove,
    winningLine: selectWinningLine(state),
    interactive: state.status === 'playing',
  }
}