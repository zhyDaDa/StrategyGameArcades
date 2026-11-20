import type { GameResult } from '@/core/contracts/result'
import type { PendingUndo } from '@/core/session/GameSession'
import { isGomokuSide, opponentOf } from '../domain/rules'
import type { GomokuEndReason, GomokuSide } from '../domain/types'
import type { GomokuBoardViewModel } from '../domain/selectors'

export const GOMOKU_SIDE_LABEL: Record<GomokuSide, string> = {
  black: '黑方',
  white: '白方',
}

export function sideLabel(side: GomokuSide | null): string {
  return side === null ? '—' : GOMOKU_SIDE_LABEL[side]
}

export interface GomokuResultViewModel {
  readonly outcome: 'win' | 'draw'
  readonly winner: GomokuSide | null
  readonly reason: GomokuEndReason | null
  readonly title: string
  readonly detail: string
}

export function toGomokuResultViewModel(
  result: GameResult,
  reason: GomokuEndReason | null,
): GomokuResultViewModel {
  if (result.outcome === 'draw') {
    return {
      outcome: 'draw',
      winner: null,
      reason,
      title: '平局',
      detail: reason === 'board-full' ? '棋盘填满，没有出现五子连珠。' : '双方未分胜负。',
    }
  }

  if (!isGomokuSide(result.winner)) {
    throw new Error(`五子棋结果中的赢家不是合法的一方：${result.winner}`)
  }
  const winner = result.winner
  const detail =
    reason === 'resign'
      ? `${GOMOKU_SIDE_LABEL[opponentOf(winner)]}认输`
      : reason === 'five'
        ? '五子连珠'
        : '对局结束'

  return {
    outcome: 'win',
    winner,
    reason,
    title: `${GOMOKU_SIDE_LABEL[winner]}获胜`,
    detail,
  }
}

export interface GomokuPendingUndoViewModel {
  readonly requester: GomokuSide
  readonly responder: GomokuSide
  readonly awaitingHuman: boolean
}

export function toGomokuPendingUndoViewModel(
  pending: PendingUndo,
  humanSides: ReadonlySet<GomokuSide>,
): GomokuPendingUndoViewModel {
  if (!isGomokuSide(pending.requestedBy) || !isGomokuSide(pending.responder)) {
    throw new Error(`五子棋悔棋申请中出现非法玩家：${pending.requestedBy} -> ${pending.responder}`)
  }
  return {
    requester: pending.requestedBy,
    responder: pending.responder,
    awaitingHuman: humanSides.has(pending.responder),
  }
}

export interface GomokuViewMessage {
  readonly type: 'info' | 'error'
  readonly text: string
}

export interface GomokuViewProps {
  readonly board: GomokuBoardViewModel
  readonly currentPlayer: GomokuSide | null
  readonly activeHumanSide: GomokuSide | null
  readonly thinkingSide: GomokuSide | null
  readonly canRequestUndo: boolean
  readonly undoRequester: GomokuSide | null
  readonly pendingUndo: GomokuPendingUndoViewModel | null
  readonly result: GomokuResultViewModel | null
  readonly moveCount: number
  readonly message: GomokuViewMessage | null
  readonly onPlace: (row: number, col: number) => void
  readonly onResign: () => void
  readonly onRequestUndo: () => void
  readonly onResolveUndo: (accept: boolean) => void
  readonly onRestart: () => void
  readonly onBackToConfig: () => void
  readonly onDismissMessage: () => void
}