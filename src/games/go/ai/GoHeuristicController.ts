import type { DecideContext, PlayerController, PlayerId } from '@/core/contracts/player'
import {
  collectGroup,
  indexOf,
  isGoSide,
  isInBounds,
  neighbors,
  opponentOf,
  playMove,
  type GoPlayResult,
} from '../domain/rules'
import type {
  GoAction,
  GoCellValue,
  GoObservation,
  GoSide,
} from '../domain/types'

type PlaceAction = Extract<GoAction, { readonly type: 'place' }>
type PassAction = Extract<GoAction, { readonly type: 'pass' }>

interface ScoredMove {
  readonly action: PlaceAction
  readonly score: number
}

/** 靠近边线的位置在开局通常吃亏；四线（星位）略优于三线。 */
const LINE_VALUE = [-150, -40, 24, 34, 14, 0] as const

/** 候选全是在自己的眼里填子时，宁可停一手。 */
const PASS_THRESHOLD = -1000

/**
 * 围棋专用 AI：规则启发式，完全确定（无随机、无计时器）。
 * 只读取 Observation 与 legalActions，并始终返回其中一个合法动作。
 *
 * 优先级：提子 -> 救回被打吃的己方块 -> 打吃对方 -> 联络与占位。
 * 除非只剩填自家眼的点，否则不会主动停一手。
 */
export class GoHeuristicController implements PlayerController<GoObservation, GoAction> {
  readonly id: PlayerId

  constructor(id: PlayerId) {
    this.id = id
  }

  async decide(ctx: DecideContext<GoObservation, GoAction>): Promise<GoAction> {
    if (!isGoSide(ctx.playerId)) {
      throw new Error(`GoHeuristicController 只接受 black / white，收到 ${ctx.playerId}`)
    }
    if (ctx.legalActions.length === 0) {
      throw new Error(`玩家 ${ctx.playerId} 没有可行动作`)
    }

    const places = ctx.legalActions.filter(
      (action): action is PlaceAction => action.type === 'place',
    )
    const passAction = ctx.legalActions.find(
      (action): action is PassAction => action.type === 'pass',
    )
    if (places.length === 0) {
      return passAction ?? ctx.legalActions[0]
    }

    const side = ctx.playerId
    const opponent = opponentOf(side)
    const { cells, size } = ctx.observation

    if (cells.every((cell) => cell === 'empty')) {
      const center = Math.floor(size / 2)
      const centerAction = places.find(
        (action) => action.row === center && action.col === center,
      )
      if (centerAction !== undefined) {
        return centerAction
      }
    }

    let best: ScoredMove | null = null

    for (const action of places) {
      const play = playMove(cells, size, action.row, action.col, side)
      if (play === null) {
        continue
      }
      const scored: ScoredMove = {
        action,
        score: scoreMove(cells, size, action, side, opponent, play),
      }
      if (best === null || isBetter(scored, best, size)) {
        best = scored
      }
    }

    if (best === null) {
      return passAction ?? ctx.legalActions[0]
    }
    if (best.score < PASS_THRESHOLD && passAction !== undefined) {
      return passAction
    }
    return best.action
  }
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
  cells: readonly GoCellValue[],
  size: number,
  action: PlaceAction,
  side: GoSide,
  opponent: GoSide,
  play: GoPlayResult,
): number {
  const { row, col } = action
  let score = play.captured.length * 10_000

  score += rescueBonus(cells, size, row, col, side)
  score += atariBonus(play.cells, size, row, col, opponent)

  if (play.captured.length === 0 && isOwnEye(cells, size, row, col, side)) {
    score -= 5_000
  }

  if (play.ownLiberties === 1) {
    score -= 700
  } else if (play.ownLiberties === 2) {
    score -= 40
  }

  score += countNeighbors(cells, size, row, col, () => true) * 18
  score += countNeighbors(cells, size, row, col, (value) => value === opponent) * 22
  score += lineValue(row, col, size)

  return score
}

/** 落点正好是相邻己方块的最后一口气：补上后整块脱离打吃。 */
function rescueBonus(
  cells: readonly GoCellValue[],
  size: number,
  row: number,
  col: number,
  side: GoSide,
): number {
  let bonus = 0
  const seen = new Set<number>()
  for (const neighbor of neighbors(size, row, col)) {
    const index = indexOf(size, neighbor.row, neighbor.col)
    if (cells[index] !== side || seen.has(index)) {
      continue
    }
    const group = collectGroup(cells, size, neighbor.row, neighbor.col)
    if (group === null) {
      continue
    }
    for (const stone of group.stones) {
      seen.add(indexOf(size, stone.row, stone.col))
    }
    if (group.liberties === 1) {
      bonus += 600
    }
  }
  return bonus
}

/** 落子后，相邻的对方块只剩一口气的数量。 */
function atariBonus(
  cells: readonly GoCellValue[],
  size: number,
  row: number,
  col: number,
  opponent: GoSide,
): number {
  let bonus = 0
  const seen = new Set<number>()
  for (const neighbor of neighbors(size, row, col)) {
    const index = indexOf(size, neighbor.row, neighbor.col)
    if (cells[index] !== opponent || seen.has(index)) {
      continue
    }
    const group = collectGroup(cells, size, neighbor.row, neighbor.col)
    if (group === null) {
      continue
    }
    for (const stone of group.stones) {
      seen.add(indexOf(size, stone.row, stone.col))
    }
    if (group.liberties === 1) {
      bonus += 350
    }
  }
  return bonus
}

/** 四邻全被己方棋子（或棋盘边界）包围：这是自己的眼，不应随手填掉。 */
function isOwnEye(
  cells: readonly GoCellValue[],
  size: number,
  row: number,
  col: number,
  side: GoSide,
): boolean {
  for (const { dr, dc } of [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ] as const) {
    const r = row + dr
    const c = col + dc
    if (!isInBounds(size, r, c)) {
      continue
    }
    if (cells[indexOf(size, r, c)] !== side) {
      return false
    }
  }
  return true
}

function countNeighbors(
  cells: readonly GoCellValue[],
  size: number,
  row: number,
  col: number,
  predicate: (value: GoCellValue) => boolean,
): number {
  let count = 0
  for (const neighbor of neighbors(size, row, col)) {
    if (predicate(cells[indexOf(size, neighbor.row, neighbor.col)])) {
      count += 1
    }
  }
  return count
}

function lineValue(row: number, col: number, size: number): number {
  const line = Math.min(row, col, size - 1 - row, size - 1 - col)
  return LINE_VALUE[Math.min(line, LINE_VALUE.length - 1)]
}

function centerDistance(row: number, col: number, size: number): number {
  const mid = (size - 1) / 2
  return Math.abs(row - mid) + Math.abs(col - mid)
}