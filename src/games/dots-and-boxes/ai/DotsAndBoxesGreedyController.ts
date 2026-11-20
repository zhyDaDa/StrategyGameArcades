import type { DecideContext, PlayerController, PlayerId } from '@/core/contracts/player'
import {
  adjacentBoxesOfEdge,
  boxOwner,
  completedBoxesIfDrawn,
  countBoxEdges,
  isDotsAndBoxesSeat,
} from '../domain/rules'
import type {
  DotsAndBoxesAction,
  DotsAndBoxesObservation,
  DotsEdge,
} from '../domain/types'

/**
 * 方格大战专用 AI：规则启发式，完全确定（无随机、无计时器）。
 * 只读取 Observation 与 legalActions，并始终返回其中一个合法动作。
 *
 * 优先级：能立刻围成方格（优先一次围两格）-> 避免把某个方格变成「只差一边」送分。
 */
export class DotsAndBoxesGreedyController implements PlayerController<
  DotsAndBoxesObservation,
  DotsAndBoxesAction
> {
  readonly id: PlayerId

  constructor(id: PlayerId) {
    this.id = id
  }

  async decide(ctx: DecideContext<DotsAndBoxesObservation, DotsAndBoxesAction>): Promise<DotsAndBoxesAction> {
    if (!isDotsAndBoxesSeat(ctx.playerId)) {
      throw new Error(`DotsAndBoxesGreedyController 只接受红 / 蓝 / 绿 / 黄席位，收到 ${ctx.playerId}`)
    }
    if (ctx.legalActions.length === 0) {
      throw new Error(`玩家 ${ctx.playerId} 没有可行动作`)
    }

    const { observation } = ctx
    let bestCompletion = -1
    let completions: DotsAndBoxesAction[] = []

    for (const action of ctx.legalActions) {
      const count = completedBoxesIfDrawn(observation, toEdge(action)).length
      if (count > bestCompletion) {
        bestCompletion = count
        completions = [action]
      } else if (count === bestCompletion) {
        completions.push(action)
      }
    }
    if (bestCompletion > 0) {
      return completions[0]
    }

    let safest = ctx.legalActions[0]
    let safestDanger = Number.POSITIVE_INFINITY
    for (const action of ctx.legalActions) {
      const danger = countGiftedBoxes(observation, toEdge(action))
      if (danger < safestDanger) {
        safestDanger = danger
        safest = action
      }
    }
    return safest
  }
}

function toEdge(action: DotsAndBoxesAction): DotsEdge {
  return { orientation: action.orientation, row: action.row, col: action.col }
}

/** 画下这条边后，会让多少个尚未归属的方格变成「只差一边」送给对手。 */
function countGiftedBoxes(observation: DotsAndBoxesObservation, edge: DotsEdge): number {
  return adjacentBoxesOfEdge(observation.boxSize, edge).filter(
    (box) => boxOwner(observation, box) === null && countBoxEdges(observation, box) === 2,
  ).length
}