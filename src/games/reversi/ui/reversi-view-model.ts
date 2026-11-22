import type { GameResult } from '@/core/contracts/result'
import type { PendingUndo } from '@/core/session/GameSession'
import { isReversiSide } from '../domain/rules'
import type { ReversiBoardViewModel } from '../domain/selectors'
import type { ReversiEvent, ReversiSide } from '../domain/types'

export const REVERSI_SIDE_LABEL: Record<ReversiSide, string> = {
  black: '黑方',
  white: '白方',
}

export function sideLabel(side: ReversiSide | null): string {
  return side === null ? '—' : REVERSI_SIDE_LABEL[side]
}

export interface ReversiDiscCounts {
  readonly black: number
  readonly white: number
}

export interface ReversiResultViewModel {
  readonly outcome: 'win' | 'draw'
  readonly winner: ReversiSide | null
  readonly title: string
  readonly detail: string
}

export function toReversiResultViewModel(
  result: GameResult,
  counts: ReversiDiscCounts,
): ReversiResultViewModel {
  const score = `黑 ${counts.black} : 白 ${counts.white}`

  if (result.outcome === 'draw') {
    return { outcome: 'draw', winner: null, title: '平局', detail: `双方棋子数量相同（${score}）。` }
  }

  if (!isReversiSide(result.winner)) {
    throw new Error(`黑白棋结果中的赢家不是合法的一方：${result.winner}`)
  }
  return {
    outcome: 'win',
    winner: result.winner,
    title: `${REVERSI_SIDE_LABEL[result.winner]}获胜`,
    detail: score,
  }
}

export interface ReversiPendingUndoViewModel {
  readonly requester: ReversiSide
  readonly responder: ReversiSide
  readonly awaitingHuman: boolean
}

export function toReversiPendingUndoViewModel(
  pending: PendingUndo,
  humanSides: ReadonlySet<ReversiSide>,
): ReversiPendingUndoViewModel {
  if (!isReversiSide(pending.requestedBy) || !isReversiSide(pending.responder)) {
    throw new Error(`黑白棋悔棋申请中出现非法玩家：${pending.requestedBy} -> ${pending.responder}`)
  }
  return {
    requester: pending.requestedBy,
    responder: pending.responder,
    awaitingHuman: humanSides.has(pending.responder),
  }
}

/** 最近一次 transition 中被自动跳过的一方；没有跳步时返回 null。 */
export function selectPassedSide(events: readonly ReversiEvent[]): ReversiSide | null {
  let passed: ReversiSide | null = null
  for (const event of events) {
    if (event.type === 'turn.passed') {
      passed = event.playerId
    }
  }
  return passed
}

export interface ReversiViewMessage {
  readonly type: 'info' | 'error'
  readonly text: string
}

export interface ReversiViewProps {
  readonly board: ReversiBoardViewModel
  readonly currentPlayer: ReversiSide | null
  readonly activeHumanSide: ReversiSide | null
  readonly thinkingSide: ReversiSide | null
  readonly counts: ReversiDiscCounts
  readonly passedSide: ReversiSide | null
  readonly canRequestUndo: boolean
  readonly undoRequester: ReversiSide | null
  readonly pendingUndo: ReversiPendingUndoViewModel | null
  readonly result: ReversiResultViewModel | null
  readonly moveCount: number
  readonly message: ReversiViewMessage | null
  readonly onPlace: (row: number, col: number) => void
  readonly onRequestUndo: () => void
  readonly onResolveUndo: (accept: boolean) => void
  readonly onRestart: () => void
  readonly onBackToConfig: () => void
  readonly onDismissMessage: () => void
}