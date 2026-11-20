import type { GameResult } from '@/core/contracts/result'
import { boxIndex, countScores } from './rules'
import type {
  DotsAndBoxesEvent,
  DotsAndBoxesSeat,
  DotsAndBoxesState,
  DotsBox,
  DotsEdge,
} from './types'

export type DotsScores = Record<DotsAndBoxesSeat, number>

export function selectScores(state: Readonly<DotsAndBoxesState>): DotsScores {
  return countScores(state.players, state.boxes)
}

export interface DotsStanding {
  readonly seat: DotsAndBoxesSeat
  readonly score: number
  /** 并列时名次相同，例如 10 / 10 / 6 对应 1 / 1 / 3。 */
  readonly rank: number
}

export function selectStandings(state: Readonly<DotsAndBoxesState>): readonly DotsStanding[] {
  const scores = selectScores(state)
  const ordered = state.players
    .map((seat) => ({ seat, score: scores[seat], order: state.players.indexOf(seat) }))
    .sort((a, b) => b.score - a.score || a.order - b.order)

  const standings: DotsStanding[] = []
  let previousScore: number | null = null
  let previousRank = 0
  ordered.forEach((entry, index) => {
    const rank = previousScore === entry.score ? previousRank : index + 1
    previousScore = entry.score
    previousRank = rank
    standings.push({ seat: entry.seat, score: entry.score, rank })
  })
  return standings
}

export function selectResult(state: Readonly<DotsAndBoxesState>): GameResult | null {
  if (state.status !== 'completed') {
    return null
  }
  return state.winner !== null
    ? { outcome: 'win', winner: state.winner }
    : { outcome: 'draw' }
}

export interface DotsBoardViewModel {
  readonly boxSize: number
  readonly players: readonly DotsAndBoxesSeat[]
  readonly horizontalEdges: readonly (DotsAndBoxesSeat | null)[]
  readonly verticalEdges: readonly (DotsAndBoxesSeat | null)[]
  readonly boxes: readonly (DotsAndBoxesSeat | null)[]
  readonly lastEdge: DotsEdge | null
  readonly interactive: boolean
}

/** State -> 棋盘展示数据（纯函数，不修改输入）。 */
export function selectDotsBoardViewModel(state: Readonly<DotsAndBoxesState>): DotsBoardViewModel {
  return {
    boxSize: state.boxSize,
    players: state.players,
    horizontalEdges: state.horizontalEdges,
    verticalEdges: state.verticalEdges,
    boxes: state.boxes,
    lastEdge: state.lastEdge,
    interactive: state.status === 'playing',
  }
}

/** 从一次 transition 的事件里取出刚被占领的方格，用于一次性刷色动画。 */
export function selectClaimedBoxes(
  events: readonly DotsAndBoxesEvent[],
): readonly { readonly box: DotsBox; readonly seat: DotsAndBoxesSeat }[] {
  return events
    .filter(
      (event): event is Extract<DotsAndBoxesEvent, { type: 'box.claimed' }> =>
        event.type === 'box.claimed',
    )
    .map((event) => ({ box: event.box, seat: event.playerId }))
}

export function claimedBoxIndexes(
  boxSize: number,
  claimed: readonly { readonly box: DotsBox }[],
): ReadonlySet<number> {
  return new Set(claimed.map(({ box }) => boxIndex(boxSize, box.row, box.col)))
}