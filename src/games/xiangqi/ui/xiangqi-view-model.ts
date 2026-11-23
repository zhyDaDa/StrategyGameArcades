import type { GameResult } from '@/core/contracts/result'
import type { PendingUndo } from '@/core/session/GameSession'
import type { XiangqiBoardViewModel } from '../domain/selectors'
import { opponentOf } from '../domain/movement'
import { isXiangqiSide } from '../domain/rules'
import type { XiangqiCoord, XiangqiEndReason, XiangqiSide } from '../domain/types'

export const XIANGQI_SIDE_LABEL: Record<XiangqiSide, string> = {
  red: '红方',
  black: '黑方',
}

export function sideLabel(side: XiangqiSide | null): string {
  return side === null ? '—' : XIANGQI_SIDE_LABEL[side]
}

export interface XiangqiResultViewModel {
  readonly outcome: 'win' | 'draw'
  readonly winner: XiangqiSide | null
  readonly reason: XiangqiEndReason | null
  readonly title: string
  readonly detail: string
}

export function toXiangqiResultViewModel(
  result: GameResult,
  reason: XiangqiEndReason | null,
): XiangqiResultViewModel {
  if (result.outcome === 'draw') {
    return {
      outcome: 'draw',
      winner: null,
      reason,
      title: '和棋',
      detail:
        reason === 'no-capture-draw'
          ? '连续 60 回合没有吃子，按规则判和。'
          : '双方均无法取胜。',
    }
  }

  if (!isXiangqiSide(result.winner)) {
    throw new Error(`中国象棋结果中的赢家不是合法的一方：${result.winner}`)
  }
  const winner = result.winner
  const loser = opponentOf(winner)
  const detail =
    reason === 'checkmate'
      ? `${XIANGQI_SIDE_LABEL[loser]}被将死`
      : reason === 'stalemate'
        ? `${XIANGQI_SIDE_LABEL[loser]}无合法着法（困毙）`
        : `${XIANGQI_SIDE_LABEL[loser]}无法继续应战`

  return {
    outcome: 'win',
    winner,
    reason,
    title: `${XIANGQI_SIDE_LABEL[winner]}获胜`,
    detail,
  }
}

export interface XiangqiPendingUndoViewModel {
  readonly requester: XiangqiSide
  readonly responder: XiangqiSide
  readonly awaitingHuman: boolean
}

export function toXiangqiPendingUndoViewModel(
  pending: PendingUndo,
  humanSides: ReadonlySet<XiangqiSide>,
): XiangqiPendingUndoViewModel {
  if (!isXiangqiSide(pending.requestedBy) || !isXiangqiSide(pending.responder)) {
    throw new Error(
      `中国象棋悔棋申请中出现非法玩家：${pending.requestedBy} -> ${pending.responder}`,
    )
  }
  return {
    requester: pending.requestedBy,
    responder: pending.responder,
    awaitingHuman: humanSides.has(pending.responder),
  }
}

export interface XiangqiViewMessage {
  readonly type: 'info' | 'error'
  readonly text: string
}

export interface XiangqiViewProps {
  readonly board: XiangqiBoardViewModel
  readonly currentPlayer: XiangqiSide | null
  readonly activeHumanSide: XiangqiSide | null
  readonly thinkingSide: XiangqiSide | null
  readonly canRequestUndo: boolean
  readonly undoRequester: XiangqiSide | null
  readonly pendingUndo: XiangqiPendingUndoViewModel | null
  readonly result: XiangqiResultViewModel | null
  readonly moveCount: number
  readonly message: XiangqiViewMessage | null
  readonly onMove: (from: XiangqiCoord, to: XiangqiCoord) => void
  readonly onRequestUndo: () => void
  readonly onResolveUndo: (accept: boolean) => void
  readonly onRestart: () => void
  readonly onBackToConfig: () => void
  readonly onDismissMessage: () => void
  /** 当前错误来自 AI 决策失败时可用：重新调用该席位控制器。 */
  readonly onRetry?: () => void
}