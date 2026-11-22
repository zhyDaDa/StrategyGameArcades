import type { DecideContext, PlayerController, PlayerId } from '@/core/contracts/player'
import {
  advancePosition,
  generateLegalMoves,
  isInCheck,
  opponentOf,
  type ChessMove,
} from '../domain/movement'
import { isChessSide } from '../domain/rules'
import type {
  ChessAction,
  ChessObservation,
  ChessPiece,
  ChessPromotionType,
  ChessSide,
} from '../domain/types'

/** 子力价值；双方的王始终在场，因此王不计入兑换价值。 */
const PIECE_VALUE: Record<ChessPiece['type'], number> = {
  king: 0,
  queen: 900,
  rook: 500,
  bishop: 330,
  knight: 320,
  pawn: 100,
}

const MATE_SCORE = 10_000_000

const PROMOTION_ORDER: Record<ChessPromotionType, number> = {
  queen: 0,
  rook: 1,
  bishop: 2,
  knight: 3,
}

interface ScoredAction {
  readonly action: ChessAction
  readonly score: number
}

/**
 * 国际象棋 AI：确定性的两层启发式搜索（自身走一步 + 对手最佳应手）。
 * 只读取 Observation 与 legalActions，并始终返回其中一个合法动作。
 *
 * 评分 = 子力差 + 少量位置分 + 将军压力；
 * 对手应手按「对我方最不利」取值，因此不会白送子。
 */
export class ChessHeuristicController
  implements PlayerController<ChessObservation, ChessAction>
{
  readonly id: PlayerId

  constructor(id: PlayerId) {
    this.id = id
  }

  async decide(
    ctx: DecideContext<ChessObservation, ChessAction>,
  ): Promise<ChessAction> {
    if (!isChessSide(ctx.playerId)) {
      throw new Error(`ChessHeuristicController 只接受 white / black，收到 ${ctx.playerId}`)
    }
    if (ctx.legalActions.length === 0) {
      throw new Error(`玩家 ${ctx.playerId} 没有可行动作`)
    }

    const side = ctx.playerId
    let best: ScoredAction | null = null

    for (const action of ctx.legalActions) {
      const scored: ScoredAction = {
        action,
        score: scoreAction(ctx.observation, side, action),
      }
      if (best === null || isBetter(scored, best)) {
        best = scored
      }
    }

    if (best === null) {
      throw new Error('ChessHeuristicController 收到空的候选集合')
    }
    return best.action
  }
}

/** 分数高者优先；并列时按起点、终点与升变类型固定顺序，保证完全确定。 */
function isBetter(candidate: ScoredAction, current: ScoredAction): boolean {
  if (candidate.score !== current.score) {
    return candidate.score > current.score
  }
  return compareAction(candidate.action, current.action) < 0
}

function compareAction(a: ChessAction, b: ChessAction): number {
  const promotionA = a.promotion ?? 'queen'
  const promotionB = b.promotion ?? 'queen'
  return (
    a.from.row - b.from.row ||
    a.from.col - b.from.col ||
    a.to.row - b.to.row ||
    a.to.col - b.to.col ||
    PROMOTION_ORDER[promotionA] - PROMOTION_ORDER[promotionB]
  )
}

function toMove(action: ChessAction): ChessMove {
  return { from: action.from, to: action.to, promotion: action.promotion ?? null }
}

function scoreAction(
  observation: Readonly<ChessObservation>,
  side: ChessSide,
  action: ChessAction,
): number {
  const opponent = opponentOf(side)
  const applied = advancePosition(observation, toMove(action))
  const replies = generateLegalMoves(applied.position, opponent)

  if (replies.length === 0) {
    return isInCheck(applied.position, opponent) ? MATE_SCORE : 0
  }

  let worstReply = Number.POSITIVE_INFINITY
  for (const reply of replies) {
    const next = advancePosition(applied.position, reply)
    const value = evaluate(next.position.cells, next.position.cols, side)
    if (value < worstReply) {
      worstReply = value
    }
  }

  const pressure = isInCheck(applied.position, opponent) ? 25 : 0
  return worstReply + pressure
}

function evaluate(
  cells: readonly (ChessPiece | null)[],
  cols: number,
  side: ChessSide,
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

/** 位置分只做方向性引导：兵前进、马象占中心、王留在底线附近。 */
function positionalBonus(piece: ChessPiece, row: number, col: number): number {
  const center =
    3.5 - Math.abs(row - 3.5) + (3.5 - Math.abs(col - 3.5))

  switch (piece.type) {
    case 'pawn': {
      const advanced = piece.side === 'white' ? 6 - row : row - 1
      const centralFile = col === 3 || col === 4 ? 8 : 0
      return advanced * 6 + centralFile
    }
    case 'knight':
      return Math.round(center * 8)
    case 'bishop':
      return Math.round(center * 5)
    case 'queen':
      return Math.round(center * 2)
    case 'rook': {
      const seventhRank = piece.side === 'white' ? 1 : 6
      return row === seventhRank ? 18 : 0
    }
    case 'king': {
      const backRankDistance = piece.side === 'white' ? row - 6 : 1 - row
      const castledCorner = (col === 6 || col === 2) && backRankDistance > 0 ? 8 : 0
      return backRankDistance * 8 + castledCorner
    }
  }
}