import type { DecideContext, PlayerController, PlayerId } from '@/core/contracts/player'
import {
  isCellEmpty,
  isGomokuSide,
  isInBounds,
  indexOf,
  opponentOf,
  wouldWinAt,
} from '../domain/rules'
import type { GomokuAction, GomokuCellValue, GomokuObservation, GomokuSide } from '../domain/types'

type PlaceAction = Extract<GomokuAction, { readonly type: 'place' }>

interface ScoredMove {
  readonly action: PlaceAction
  readonly score: number
}

const AXES = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
] as const

/**
 * 五子棋专用 AI：规则启发式，完全确定（无随机、无计时器）。
 * 只读取 Observation 与 legalActions，并始终返回其中一个合法动作。
 *
 * 优先级：自己能连五 -> 堵对方连五 -> 局面分（连子潜势 + 邻接 + 中心）。
 * 选项含义由 GomokuAction 判别联合直接表达：place{row,col} = 落子，resign = 认输。
 */
export class GomokuHeuristicController implements PlayerController<GomokuObservation, GomokuAction> {
  readonly id: PlayerId

  constructor(id: PlayerId) {
    this.id = id
  }

  async decide(ctx: DecideContext<GomokuObservation, GomokuAction>): Promise<GomokuAction> {
    if (!isGomokuSide(ctx.playerId)) {
      throw new Error(`GomokuHeuristicController 只接受 black / white，收到 ${ctx.playerId}`)
    }
    if (ctx.legalActions.length === 0) {
      throw new Error(`玩家 ${ctx.playerId} 没有可行动作`)
    }

    const places = ctx.legalActions.filter(
      (action): action is PlaceAction => action.type === 'place',
    )
    if (places.length === 0) {
      return ctx.legalActions[0]
    }

    const { cells, size } = ctx.observation
    const side = ctx.playerId
    const opponent = opponentOf(side)

    const winning = places.find((place) =>
      wouldWinAt(cells, size, place.row, place.col, side),
    )
    if (winning !== undefined) {
      return winning
    }

    const blocking = places.filter((place) =>
      wouldWinAt(cells, size, place.row, place.col, opponent),
    )
    if (blocking.length > 0) {
      return pickBest(blocking, cells, size, side, opponent)
    }

    return pickBest(places, cells, size, side, opponent)
  }
}

function pickBest(
  moves: readonly PlaceAction[],
  cells: readonly GomokuCellValue[],
  size: number,
  side: GomokuSide,
  opponent: GomokuSide,
): PlaceAction {
  let best: ScoredMove | null = null
  for (const action of moves) {
    const scored: ScoredMove = {
      action,
      score: scoreMove(cells, size, action.row, action.col, side, opponent),
    }
    if (best === null || isBetter(scored, best, size)) {
      best = scored
    }
  }
  if (best === null) {
    throw new Error('pickBest 收到空的候选集合')
  }
  return best.action
}

/** 分数高者优先；并列时靠近中心、再按 row/col 从小到大，保证确定性。 */
function isBetter(candidate: ScoredMove, current: ScoredMove, size: number): boolean {
  if (candidate.score !== current.score) {
    return candidate.score > current.score
  }
  const candidateDistance = centerDistance(candidate.action.row, candidate.action.col, size)
  const currentDistance = centerDistance(current.action.row, current.action.col, size)
  if (candidateDistance !== currentDistance) {
    return candidateDistance < currentDistance
  }
  if (candidate.action.row !== current.action.row) {
    return candidate.action.row < current.action.row
  }
  return candidate.action.col < current.action.col
}

function scoreMove(
  cells: readonly GomokuCellValue[],
  size: number,
  row: number,
  col: number,
  side: GomokuSide,
  opponent: GomokuSide,
): number {
  if (!isCellEmpty(cells, size, row, col)) {
    return Number.NEGATIVE_INFINITY
  }
  const own = scorePotential(cells, size, row, col, side)
  const defense = scorePotential(cells, size, row, col, opponent)
  const neighbors = neighborScore(cells, size, row, col)
  return own + defense * 0.9 + neighbors * 30
}

/** 四个方向上「如果在此落子」能形成的连子潜势之和。 */
function scorePotential(
  cells: readonly GomokuCellValue[],
  size: number,
  row: number,
  col: number,
  side: GomokuSide,
): number {
  let total = 0
  for (const axis of AXES) {
    const forward = countRun(cells, size, row, col, side, axis.dr, axis.dc)
    const backward = countRun(cells, size, row, col, side, -axis.dr, -axis.dc)
    const length = forward + backward + 1
    const openEnds = openEndCount(cells, size, row, col, side, axis.dr, axis.dc)
    total += runValue(length, openEnds)
  }
  return total
}

function countRun(
  cells: readonly GomokuCellValue[],
  size: number,
  row: number,
  col: number,
  side: GomokuSide,
  dr: number,
  dc: number,
): number {
  let count = 0
  let r = row + dr
  let c = col + dc
  while (isInBounds(size, r, c) && cells[indexOf(size, r, c)] === side) {
    count += 1
    r += dr
    c += dc
  }
  return count
}

/** 两端是否为空位；越界视为被堵住。 */
function openEndCount(
  cells: readonly GomokuCellValue[],
  size: number,
  row: number,
  col: number,
  side: GomokuSide,
  dr: number,
  dc: number,
): number {
  return (
    (isOpenEnd(cells, size, row, col, side, dr, dc) ? 1 : 0) +
    (isOpenEnd(cells, size, row, col, side, -dr, -dc) ? 1 : 0)
  )
}

function isOpenEnd(
  cells: readonly GomokuCellValue[],
  size: number,
  row: number,
  col: number,
  side: GomokuSide,
  dr: number,
  dc: number,
): boolean {
  let r = row + dr
  let c = col + dc
  while (isInBounds(size, r, c) && cells[indexOf(size, r, c)] === side) {
    r += dr
    c += dc
  }
  return isInBounds(size, r, c) && cells[indexOf(size, r, c)] === 'empty'
}

function runValue(length: number, openEnds: number): number {
  if (length >= 5) {
    return 1_000_000
  }
  if (openEnds === 0) {
    return 0
  }
  switch (length) {
    case 4:
      return openEnds === 2 ? 50_000 : 8_000
    case 3:
      return openEnds === 2 ? 3_000 : 400
    case 2:
      return openEnds === 2 ? 200 : 40
    case 1:
      return openEnds === 2 ? 10 : 2
    default:
      return 0
  }
}

/** 半径 2 内的已有落子密度，越近权重越高。 */
function neighborScore(
  cells: readonly GomokuCellValue[],
  size: number,
  row: number,
  col: number,
): number {
  let score = 0
  for (let dr = -2; dr <= 2; dr += 1) {
    for (let dc = -2; dc <= 2; dc += 1) {
      if (dr === 0 && dc === 0) {
        continue
      }
      const r = row + dr
      const c = col + dc
      if (!isInBounds(size, r, c) || cells[indexOf(size, r, c)] === 'empty') {
        continue
      }
      score += Math.abs(dr) <= 1 && Math.abs(dc) <= 1 ? 2 : 1
    }
  }
  return score
}

function centerDistance(row: number, col: number, size: number): number {
  const mid = (size - 1) / 2
  return Math.abs(row - mid) + Math.abs(col - mid)
}