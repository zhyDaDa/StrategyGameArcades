import type { DecideContext, PlayerController, PlayerId } from '@/core/contracts/player'
import { findFlips, indexOf, isReversiSide, opponentOf } from '../domain/rules'
import type {
  ReversiAction,
  ReversiCellValue,
  ReversiObservation,
  ReversiSide,
} from '../domain/types'

interface ScoredMove {
  readonly action: ReversiAction
  readonly score: number
}

/** 8×8 标准位置权重：角最好，角旁与边线次之。 */
const POSITION_WEIGHTS = [
  100, -20, 10, 5, 5, 10, -20, 100,
  -20, -50, -2, -2, -2, -2, -50, -20,
  10, -2, 1, 1, 1, 1, -2, 10,
  5, -2, 1, 0, 0, 1, -2, 5,
  5, -2, 1, 0, 0, 1, -2, 5,
  10, -2, 1, 1, 1, 1, -2, 10,
  -20, -50, -2, -2, -2, -2, -50, -20,
  100, -20, 10, 5, 5, 10, -20, 100,
] as const

/**
 * 黑白棋专用 AI：规则启发式，完全确定（无随机、无计时器）。
 * 只读取 Observation 与 legalActions，并始终返回其中一个合法动作。
 *
 * 评分：位置权重 + 翻转收益 - 对手落子机会（机动性）。
 */
export class ReversiHeuristicController implements PlayerController<ReversiObservation, ReversiAction> {
  readonly id: PlayerId

  constructor(id: PlayerId) {
    this.id = id
  }

  async decide(ctx: DecideContext<ReversiObservation, ReversiAction>): Promise<ReversiAction> {
    if (!isReversiSide(ctx.playerId)) {
      throw new Error(`ReversiHeuristicController 只接受 black / white，收到 ${ctx.playerId}`)
    }
    if (ctx.legalActions.length === 0) {
      throw new Error(`玩家 ${ctx.playerId} 没有可行动作`)
    }

    const { cells, size } = ctx.observation
    const side = ctx.playerId
    const opponent = opponentOf(side)
    let best: ScoredMove | null = null

    for (const action of ctx.legalActions) {
      const scored: ScoredMove = {
        action,
        score: scoreMove(cells, size, action, side, opponent),
      }
      if (best === null || isBetter(scored, best)) {
        best = scored
      }
    }

    if (best === null) {
      throw new Error('ReversiHeuristicController 收到空的候选集合')
    }
    return best.action
  }
}

/** 分数高者优先；并列按 row/col 从小到大，保证确定性。 */
function isBetter(candidate: ScoredMove, current: ScoredMove): boolean {
  if (candidate.score !== current.score) {
    return candidate.score > current.score
  }
  if (candidate.action.row !== current.action.row) {
    return candidate.action.row < current.action.row
  }
  return candidate.action.col < current.action.col
}

function scoreMove(
  cells: readonly ReversiCellValue[],
  size: number,
  action: ReversiAction,
  side: ReversiSide,
  opponent: ReversiSide,
): number {
  const flips = findFlips(cells, size, action.row, action.col, side)
  if (flips.length === 0) {
    return Number.NEGATIVE_INFINITY
  }

  const nextCells = placeLocally(cells, size, action, side, flips)
  const opponentMoves = countLegalMoves(nextCells, size, opponent)
  const weight =
    size === 8 ? POSITION_WEIGHTS[action.row * size + action.col] ?? 0 : 0

  return weight + flips.length * 2 - opponentMoves * 3
}

function placeLocally(
  cells: readonly ReversiCellValue[],
  size: number,
  action: ReversiAction,
  side: ReversiSide,
  flipped: readonly { readonly row: number; readonly col: number }[],
): readonly ReversiCellValue[] {
  const next = cells.slice()
  next[indexOf(size, action.row, action.col)] = side
  for (const coord of flipped) {
    next[indexOf(size, coord.row, coord.col)] = side
  }
  return next
}

function countLegalMoves(
  cells: readonly ReversiCellValue[],
  size: number,
  side: ReversiSide,
): number {
  let count = 0
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (cells[indexOf(size, row, col)] !== 'empty') {
        continue
      }
      if (findFlips(cells, size, row, col, side).length > 0) {
        count += 1
      }
    }
  }
  return count
}