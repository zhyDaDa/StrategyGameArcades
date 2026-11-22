import type { DecideContext, PlayerController, PlayerId } from '@/core/contracts/player'
import {
  applyMoveToCells,
  generateLegalMoves,
  hasCrossedRiver,
  isInCheck,
  opponentOf,
} from '../domain/movement'
import { isXiangqiSide } from '../domain/rules'
import type {
  XiangqiAction,
  XiangqiObservation,
  XiangqiPiece,
  XiangqiSide,
} from '../domain/types'

/** 子力价值：将帅不在评估中作为可兑换子力，仅用于兜底。 */
const PIECE_VALUE: Record<XiangqiPiece['type'], number> = {
  general: 1_000_000,
  chariot: 900,
  cannon: 450,
  horse: 430,
  advisor: 200,
  elephant: 200,
  soldier: 100,
}

const MATE_SCORE = 10_000_000

interface ScoredMove {
  readonly action: XiangqiAction
  readonly score: number
}

/**
 * 中国象棋 AI：确定性的两层启发式搜索（自身走一步 + 对手最佳应手）。
 * 只读取 Observation 与 legalActions，并始终返回其中一个合法动作。
 *
 * 评分 = 子力差 + 少量位置分 + 将军压力；
 * 对手应手按“对我方最不利”取值，因此不会白送子。
 */
export class XiangqiHeuristicController
  implements PlayerController<XiangqiObservation, XiangqiAction>
{
  readonly id: PlayerId

  constructor(id: PlayerId) {
    this.id = id
  }

  async decide(
    ctx: DecideContext<XiangqiObservation, XiangqiAction>,
  ): Promise<XiangqiAction> {
    if (!isXiangqiSide(ctx.playerId)) {
      throw new Error(`XiangqiHeuristicController 只接受 red / black，收到 ${ctx.playerId}`)
    }
    if (ctx.legalActions.length === 0) {
      throw new Error(`玩家 ${ctx.playerId} 没有可行动作`)
    }

    const side = ctx.playerId
    const { cells, rows, cols } = ctx.observation
    let best: ScoredMove | null = null

    for (const action of ctx.legalActions) {
      const scored: ScoredMove = {
        action,
        score: scoreAction(cells, rows, cols, side, action),
      }
      if (best === null || isBetter(scored, best)) {
        best = scored
      }
    }

    if (best === null) {
      throw new Error('XiangqiHeuristicController 收到空的候选集合')
    }
    return best.action
  }
}

/** 分数高者优先；并列时按起点、终点坐标固定顺序，保证完全确定。 */
function isBetter(candidate: ScoredMove, current: ScoredMove): boolean {
  if (candidate.score !== current.score) {
    return candidate.score > current.score
  }
  return compareAction(candidate.action, current.action) < 0
}

function compareAction(a: XiangqiAction, b: XiangqiAction): number {
  return (
    a.from.row - b.from.row ||
    a.from.col - b.from.col ||
    a.to.row - b.to.row ||
    a.to.col - b.to.col
  )
}

function scoreAction(
  cells: XiangqiObservation['cells'],
  rows: number,
  cols: number,
  side: XiangqiSide,
  action: XiangqiAction,
): number {
  const opponent = opponentOf(side)
  const moved = applyMoveToCells(cells, cols, action.from, action.to)
  const opponentReplies = generateLegalMoves(moved.cells, rows, cols, opponent)

  if (opponentReplies.length === 0) {
    return MATE_SCORE
  }

  let worstReply = Number.POSITIVE_INFINITY
  for (const reply of opponentReplies) {
    const next = applyMoveToCells(moved.cells, cols, reply.from, reply.to)
    const value = evaluate(next.cells, cols, side)
    if (value < worstReply) {
      worstReply = value
    }
  }

  const pressure = isInCheck(moved.cells, rows, cols, opponent) ? 30 : 0
  return worstReply + pressure
}

function evaluate(
  cells: readonly (XiangqiPiece | null)[],
  cols: number,
  side: XiangqiSide,
): number {
  let score = 0
  for (let index = 0; index < cells.length; index += 1) {
    const piece = cells[index]
    if (piece === null) {
      continue
    }
    const row = Math.floor(index / cols)
    const col = index % cols
    const value = PIECE_VALUE[piece.type] + positionalBonus(piece, row, col)
    score += piece.side === side ? value : -value
  }
  return score
}

/** 位置分只做方向性引导：兵过河、马炮占中路，不做复杂局面评估。 */
function positionalBonus(piece: XiangqiPiece, row: number, col: number): number {
  switch (piece.type) {
    case 'soldier': {
      const advanced = piece.side === 'red' ? 6 - row : row - 3
      const crossed = hasCrossedRiver(piece.side, row) ? 40 : 0
      return advanced * 8 + crossed
    }
    case 'horse':
    case 'cannon': {
      const central = col >= 3 && col <= 5 ? 14 : 0
      const advanced = piece.side === 'red' ? 9 - row : row
      return central + advanced * 2
    }
    default:
      return 0
  }
}