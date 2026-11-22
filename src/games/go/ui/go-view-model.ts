import type { GameResult } from '@/core/contracts/result'
import type { PendingUndo } from '@/core/session/GameSession'
import { isGoSide, opponentOf } from '../domain/rules'
import type { GoBoardViewModel } from '../domain/selectors'
import type {
  GoCaptures,
  GoEndReason,
  GoEvent,
  GoScore,
  GoSide,
} from '../domain/types'

export const GO_SIDE_LABEL: Record<GoSide, string> = {
  black: '黑方',
  white: '白方',
}

export function sideLabel(side: GoSide | null): string {
  return side === null ? '—' : GO_SIDE_LABEL[side]
}

export interface GoResultViewModel {
  readonly outcome: 'win' | 'draw'
  readonly winner: GoSide | null
  readonly reason: GoEndReason | null
  readonly title: string
  readonly detail: string
}

export function toGoResultViewModel(
  result: GameResult,
  reason: GoEndReason | null,
  score: GoScore | null,
): GoResultViewModel {
  const scoreText =
    score === null
      ? null
      : `黑 ${score.black} 目 · 白 ${score.white} 目（含贴目 ${score.komi}）`

  if (result.outcome === 'draw') {
    return {
      outcome: 'draw',
      winner: null,
      reason,
      title: '平局',
      detail: scoreText ?? '双方数子相同。',
    }
  }

  if (!isGoSide(result.winner)) {
    throw new Error(`围棋结果中的赢家不是合法的一方：${result.winner}`)
  }
  const winner = result.winner
  const detail =
    reason === 'resign'
      ? `${GO_SIDE_LABEL[opponentOf(winner)]}认输`
      : (scoreText ?? '双方连续停一手，数子结束')

  return {
    outcome: 'win',
    winner,
    reason,
    title: `${GO_SIDE_LABEL[winner]}获胜`,
    detail,
  }
}

export interface GoPendingUndoViewModel {
  readonly requester: GoSide
  readonly responder: GoSide
  readonly awaitingHuman: boolean
}

export function toGoPendingUndoViewModel(
  pending: PendingUndo,
  humanSides: ReadonlySet<GoSide>,
): GoPendingUndoViewModel {
  if (!isGoSide(pending.requestedBy) || !isGoSide(pending.responder)) {
    throw new Error(`围棋悔棋申请中出现非法玩家：${pending.requestedBy} -> ${pending.responder}`)
  }
  return {
    requester: pending.requestedBy,
    responder: pending.responder,
    awaitingHuman: humanSides.has(pending.responder),
  }
}

/** 最近一次 transition 中停一手的一方；没有停手时返回 null。 */
export function selectPassedSide(events: readonly GoEvent[]): GoSide | null {
  let passed: GoSide | null = null
  for (const event of events) {
    if (event.type === 'turn.passed') {
      passed = event.playerId
    }
  }
  return passed
}

export interface GoViewMessage {
  readonly type: 'info' | 'error'
  readonly text: string
}

export interface GoViewProps {
  readonly board: GoBoardViewModel
  readonly currentPlayer: GoSide | null
  readonly activeHumanSide: GoSide | null
  readonly thinkingSide: GoSide | null
  readonly captures: GoCaptures
  readonly passedSide: GoSide | null
  readonly canRequestUndo: boolean
  readonly undoRequester: GoSide | null
  readonly pendingUndo: GoPendingUndoViewModel | null
  readonly result: GoResultViewModel | null
  readonly moveCount: number
  readonly message: GoViewMessage | null
  readonly onPlace: (row: number, col: number) => void
  readonly onPass: () => void
  readonly onResign: () => void
  readonly onRequestUndo: () => void
  readonly onResolveUndo: (accept: boolean) => void
  readonly onRestart: () => void
  readonly onBackToConfig: () => void
  readonly onDismissMessage: () => void
}