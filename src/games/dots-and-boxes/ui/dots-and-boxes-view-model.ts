import type { PendingUndo } from '@/core/session/GameSession'
import { SEAT_KIND_META } from '@/presentation/match-setup/seat-kinds'
import type { SeatAssignment, SeatType } from '@/presentation/match-setup/types'
import { isDotsAndBoxesSeat } from '../domain/rules'
import { selectScores, selectStandings, type DotsBoardViewModel } from '../domain/selectors'
import type {
  DotsAndBoxesSeat,
  DotsAndBoxesState,
  DotsEdge,
} from '../domain/types'
import { DOTS_SEAT_META } from './seat-meta'

export interface DotsPlayerViewModel {
  readonly seat: DotsAndBoxesSeat
  readonly name: string
  readonly label: string
  readonly score: number
  readonly isCurrent: boolean
  readonly isThinking: boolean
  /** 该玩家刚得分时为本次 transition 的版本号，用于分数块脉冲动画。 */
  readonly pulseVersion: number | null
}

export interface DotsResultViewModel {
  readonly title: string
  readonly detail: string
}

export interface DotsPendingUndoViewModel {
  readonly requester: DotsAndBoxesSeat
  readonly responder: DotsAndBoxesSeat
  readonly requesterName: string
  readonly responderName: string
  readonly awaitingHuman: boolean
}

export interface DotsViewMessage {
  readonly type: 'info' | 'error'
  readonly text: string
}

export interface DotsAndBoxesViewProps {
  readonly board: DotsBoardViewModel
  readonly players: readonly DotsPlayerViewModel[]
  readonly freshEdge: DotsEdge | null
  readonly drawVersion: number
  readonly interactive: boolean
  readonly freshClaims: ReadonlySet<number>
  readonly canRequestUndo: boolean
  readonly undoRequester: DotsAndBoxesSeat | null
  readonly pendingUndo: DotsPendingUndoViewModel | null
  readonly result: DotsResultViewModel | null
  readonly message: DotsViewMessage | null
  readonly onDrawEdge: (edge: DotsEdge) => void
  readonly onRequestUndo: () => void
  readonly onResolveUndo: (accept: boolean) => void
  readonly onRestart: () => void
  readonly onBackToConfig: () => void
  readonly onDismissMessage: () => void
  /** 当前错误来自 AI 决策失败时可用：重新调用该席位控制器。 */
  readonly onRetry?: () => void
}

export function buildSeatNames(
  seats: readonly SeatAssignment<DotsAndBoxesSeat>[],
  youSeat: DotsAndBoxesSeat | null,
): Record<DotsAndBoxesSeat, string> {
  const names: Record<DotsAndBoxesSeat, string> = {
    red: DOTS_SEAT_META.red.label,
    blue: DOTS_SEAT_META.blue.label,
    green: DOTS_SEAT_META.green.label,
    yellow: DOTS_SEAT_META.yellow.label,
  }
  const counts: Partial<Record<SeatType, number>> = {}
  seats.forEach((seat, index) => {
    if (seat.type !== 'human') {
      const count = (counts[seat.type] ?? 0) + 1
      counts[seat.type] = count
      names[seat.id] = `${SEAT_KIND_META[seat.type].label} ${count}`
    } else {
      names[seat.id] = seat.name ?? (seat.id === youSeat ? '你' : `玩家 ${index + 1}`)
    }
  })
  return names
}

export interface DotsPlayersParams {
  readonly state: Readonly<DotsAndBoxesState>
  readonly names: Record<DotsAndBoxesSeat, string>
  readonly thinkingSeat: DotsAndBoxesSeat | null
  readonly pulseSeat: DotsAndBoxesSeat | null
  readonly pulseVersion: number
}

export function toDotsPlayersViewModel(params: DotsPlayersParams): readonly DotsPlayerViewModel[] {
  const { state, names, thinkingSeat, pulseSeat, pulseVersion } = params
  const scores = selectScores(state)

  return state.players.map((seat) => ({
    seat,
    name: names[seat],
    label: DOTS_SEAT_META[seat].label,
    score: scores[seat],
    isCurrent: state.status === 'playing' && state.currentPlayer === seat,
    isThinking: thinkingSeat === seat,
    pulseVersion: pulseSeat === seat ? pulseVersion : null,
  }))
}

export function toDotsResultViewModel(
  state: Readonly<DotsAndBoxesState>,
  names: Record<DotsAndBoxesSeat, string>,
): DotsResultViewModel | null {
  if (state.status !== 'completed') {
    return null
  }
  const standings = selectStandings(state)
  const winner = state.winner
  const detail = standings
    .map((standing) => `${names[standing.seat]} ${standing.score} 分`)
    .join(' · ')

  return {
    title: winner === null ? '平局' : `${names[winner]}获胜`,
    detail,
  }
}

export function toDotsPendingUndoViewModel(
  pending: PendingUndo,
  humanSeats: ReadonlySet<DotsAndBoxesSeat>,
  names: Record<DotsAndBoxesSeat, string>,
): DotsPendingUndoViewModel {
  if (!isDotsAndBoxesSeat(pending.requestedBy) || !isDotsAndBoxesSeat(pending.responder)) {
    throw new Error(`方格大战悔棋申请中出现非法玩家：${pending.requestedBy} -> ${pending.responder}`)
  }
  return {
    requester: pending.requestedBy,
    responder: pending.responder,
    requesterName: names[pending.requestedBy],
    responderName: names[pending.responder],
    awaitingHuman: humanSeats.has(pending.responder),
  }
}