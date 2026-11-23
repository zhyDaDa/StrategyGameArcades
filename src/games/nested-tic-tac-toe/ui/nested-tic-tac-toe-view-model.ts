import type { GameResult } from '@/core/contracts/result'
import type { PendingUndo } from '@/core/session/GameSession'
import { PLAYER_SEAT_META } from '@/presentation/player-seats/player-seats'
import { isNestedTicTacToeSide } from '../domain/rules'
import type {
  NestedTicTacToeBoardViewModel,
  NestedTicTacToeEndReason,
} from '../domain/selectors'
import type { NestedTicTacToeCoord, NestedTicTacToeSide } from '../domain/types'

export function sideLabel(side: NestedTicTacToeSide | null): string {
  return side === null ? '—' : PLAYER_SEAT_META[side].label
}

export interface NestedTicTacToeResultViewModel {
  readonly outcome: 'win' | 'draw'
  readonly winner: NestedTicTacToeSide | null
  readonly reason: NestedTicTacToeEndReason | null
  readonly title: string
  readonly detail: string
}

export function toNestedResultViewModel(
  result: GameResult,
  reason: NestedTicTacToeEndReason | null,
): NestedTicTacToeResultViewModel {
  if (result.outcome === 'draw') {
    return {
      outcome: 'draw',
      winner: null,
      reason,
      title: '平局',
      detail:
        reason === 'all-resolved'
          ? '九宫全部落定，没有人完成大棋盘三连。'
          : '双方未分胜负。',
    }
  }

  if (!isNestedTicTacToeSide(result.winner)) {
    throw new Error(`九宫井字棋结果中的赢家不是合法的一方：${result.winner}`)
  }
  return {
    outcome: 'win',
    winner: result.winner,
    reason,
    title: `${PLAYER_SEAT_META[result.winner].label}获胜`,
    detail: reason === 'macro-line' ? '在大棋盘上连成三宫。' : '对局结束。',
  }
}

export interface NestedTicTacToePendingUndoViewModel {
  readonly requester: NestedTicTacToeSide
  readonly responder: NestedTicTacToeSide
  readonly awaitingHuman: boolean
}

export function toNestedPendingUndoViewModel(
  pending: PendingUndo,
  humanSides: ReadonlySet<NestedTicTacToeSide>,
): NestedTicTacToePendingUndoViewModel {
  if (!isNestedTicTacToeSide(pending.requestedBy) || !isNestedTicTacToeSide(pending.responder)) {
    throw new Error(
      `九宫井字棋悔棋申请中出现非法玩家：${pending.requestedBy} -> ${pending.responder}`,
    )
  }
  return {
    requester: pending.requestedBy,
    responder: pending.responder,
    awaitingHuman: humanSides.has(pending.responder),
  }
}

export interface NestedTicTacToeViewMessage {
  readonly type: 'info' | 'error'
  readonly text: string
}

export interface NestedTicTacToeViewProps {
  readonly board: NestedTicTacToeBoardViewModel
  readonly currentSide: NestedTicTacToeSide | null
  readonly activeHumanSide: NestedTicTacToeSide | null
  readonly thinkingSide: NestedTicTacToeSide | null
  readonly capturedCounts: Record<NestedTicTacToeSide, number>
  readonly canRequestUndo: boolean
  readonly undoRequester: NestedTicTacToeSide | null
  readonly pendingUndo: NestedTicTacToePendingUndoViewModel | null
  readonly result: NestedTicTacToeResultViewModel | null
  readonly moveCount: number
  readonly freshCell: NestedTicTacToeCoord | null
  readonly freshMicroBoards: ReadonlySet<number>
  readonly message: NestedTicTacToeViewMessage | null
  readonly onPlace: (row: number, col: number) => void
  readonly onRequestUndo: () => void
  readonly onResolveUndo: (accept: boolean) => void
  readonly onRestart: () => void
  readonly onBackToConfig: () => void
  readonly onDismissMessage: () => void
  /** 当前错误来自 AI 决策失败时可用：重新调用该席位控制器。 */
  readonly onRetry?: () => void
}