import type { DecideContext, PlayerController, PlayerId } from '@/core/contracts/player'
import {
  countMacroThreats,
  countMicroThreats,
  hasImmediateMicroWin,
  isNestedTicTacToeSide,
  listLegalActions,
  opponentOf,
  simulatePlace,
} from '../domain/rules'
import type {
  NestedTicTacToeAction,
  NestedTicTacToeCellValue,
  NestedTicTacToeObservation,
  NestedTicTacToeSide,
  NestedTicTacToeState,
} from '../domain/types'

const MACRO_WEIGHT = [3, 2, 3, 2, 4, 2, 3, 2, 3] as const
const INNER_WEIGHT = [3, 2, 3, 2, 4, 2, 3, 2, 3] as const

const SCORE_MACRO_WIN = 10_000_000
const SCORE_OPPONENT_MACRO_WIN = -500_000
const SCORE_TERMINAL_DRAW = 0
const SCORE_MICRO_CLAIM = 5_000
const SCORE_MICRO_CLAIM_BOARD = 200
const SCORE_MICRO_DRAW = -500
const SCORE_GIFT_FREE_MOVE = -600
const SCORE_OPPONENT_IMMEDIATE_MICRO_WIN = -2_500
const SCORE_OPPONENT_MICRO_THREAT = -150
const SCORE_OWN_MICRO_THREAT = 120
const SCORE_OWN_MACRO_THREAT = 60
const SCORE_OPPONENT_MACRO_THREAT = -80
const SCORE_MACRO_POSITION = 25
const SCORE_INNER_POSITION = 10

interface ScoredMove {
  readonly action: NestedTicTacToeAction
  readonly score: number
}

/**
 * 九宫井字棋专用 AI：规则启发式，完全确定（无随机、无计时器）。
 * 只读取 Observation 与 legalActions，并始终返回其中一个合法动作。
 * 每次候选都复用 `simulatePlace`，与规则层保持同一套三连判断。
 */
export class NestedTicTacToeHeuristicController
  implements PlayerController<NestedTicTacToeObservation, NestedTicTacToeAction>
{
  readonly id: PlayerId

  constructor(id: PlayerId) {
    this.id = id
  }

  async decide(
    ctx: DecideContext<NestedTicTacToeObservation, NestedTicTacToeAction>,
  ): Promise<NestedTicTacToeAction> {
    if (!isNestedTicTacToeSide(ctx.playerId)) {
      throw new Error(
        `NestedTicTacToeHeuristicController 只接受 red / blue，收到 ${ctx.playerId}`,
      )
    }
    if (ctx.legalActions.length === 0) {
      throw new Error(`玩家 ${ctx.playerId} 没有可行动作`)
    }

    const side = ctx.playerId
    let best: ScoredMove | null = null

    for (const action of ctx.legalActions) {
      const scored: ScoredMove = {
        action,
        score: scoreMove(ctx.observation.cells, side, action),
      }
      if (best === null || isBetter(scored, best)) {
        best = scored
      }
    }

    if (best === null) {
      throw new Error('NestedTicTacToeHeuristicController 收到空的候选集合')
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
  cells: readonly NestedTicTacToeCellValue[],
  side: NestedTicTacToeSide,
  action: NestedTicTacToeAction,
): number {
  const opponent = opponentOf(side)
  const outcome = simulatePlace(cells, side, action.row, action.col)

  if (outcome.macro.winner === side) {
    return SCORE_MACRO_WIN
  }
  if (outcome.macro.allResolved) {
    return SCORE_TERMINAL_DRAW
  }
  if (opponentCanWinMacro(outcome.cells, action, opponent)) {
    return SCORE_OPPONENT_MACRO_WIN
  }

  let score = 0

  if (outcome.claimed === side) {
    score += SCORE_MICRO_CLAIM + SCORE_MICRO_CLAIM_BOARD * MACRO_WEIGHT[outcome.board]
  } else if (outcome.claimed === 'draw') {
    score += SCORE_MICRO_DRAW
  }

  if (outcome.forcedBoard === null) {
    score += SCORE_GIFT_FREE_MOVE
  } else {
    const board = outcome.forcedBoard
    if (hasImmediateMicroWin(outcome.cells, board, opponent)) {
      score += SCORE_OPPONENT_IMMEDIATE_MICRO_WIN
    }
    score += SCORE_OPPONENT_MICRO_THREAT * countMicroThreats(outcome.cells, board, opponent)
    score += SCORE_OWN_MICRO_THREAT * countMicroThreats(outcome.cells, board, side)
  }

  score += SCORE_OWN_MACRO_THREAT * countMacroThreats(outcome.microResults, side)
  score += SCORE_OPPONENT_MACRO_THREAT * countMacroThreats(outcome.microResults, opponent)

  const inner = (action.row % 3) * 3 + (action.col % 3)
  score += SCORE_MACRO_POSITION * MACRO_WEIGHT[outcome.board]
  score += SCORE_INNER_POSITION * INNER_WEIGHT[inner]

  return score
}

/** 落子后，对手是否已经存在一步完成大棋盘三连的走法。 */
function opponentCanWinMacro(
  cells: readonly NestedTicTacToeCellValue[],
  action: NestedTicTacToeAction,
  opponent: NestedTicTacToeSide,
): boolean {
  const nextState: NestedTicTacToeState = {
    cells,
    currentPlayer: opponent,
    lastMove: { row: action.row, col: action.col },
    status: 'playing',
    winner: null,
    moveCount: 0,
  }

  for (const reply of listLegalActions(nextState, opponent)) {
    const replyOutcome = simulatePlace(cells, opponent, reply.row, reply.col)
    if (replyOutcome.macro.winner === opponent) {
      return true
    }
  }
  return false
}