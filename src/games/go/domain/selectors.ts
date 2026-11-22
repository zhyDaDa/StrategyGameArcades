import type { GameResult } from '@/core/contracts/result'
import { getLegalMoves } from './rules'
import type {
  GoCaptures,
  GoCellValue,
  GoCoord,
  GoEndReason,
  GoScore,
  GoSide,
  GoState,
} from './types'

export function selectResult(state: Readonly<GoState>): GameResult | null {
  if (state.status !== 'completed') {
    return null
  }
  return state.winner !== null
    ? { outcome: 'win', winner: state.winner }
    : { outcome: 'draw' }
}

export function selectEndReason(state: Readonly<GoState>): GoEndReason | null {
  return state.endReason
}

export function selectScore(state: Readonly<GoState>): GoScore | null {
  return state.score
}

export function selectCaptures(state: Readonly<GoState>): GoCaptures {
  return state.captured
}

export interface GoBoardViewModel {
  readonly size: number
  readonly cells: readonly GoCellValue[]
  readonly lastMove: GoCoord | null
  readonly lastCaptured: readonly GoCoord[]
  readonly koPoint: GoCoord | null
  readonly legalPoints: readonly GoCoord[]
  readonly interactive: boolean
}

/** State -> 棋盘展示数据（含当前可落点提示）。 */
export function selectGoBoardViewModel(state: Readonly<GoState>): GoBoardViewModel {
  const currentPlayer: GoSide | null = state.status === 'playing' ? state.currentPlayer : null
  return {
    size: state.size,
    cells: state.cells,
    lastMove: state.lastMove,
    lastCaptured: state.lastCaptured,
    koPoint: state.koPoint,
    legalPoints:
      currentPlayer === null
        ? []
        : getLegalMoves(state.cells, state.size, currentPlayer, state.koPoint),
    interactive: state.status === 'playing',
  }
}