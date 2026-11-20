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

const MAX_SAFE_TRIES = 5

/**
 * 方格大战专用 AI：
 * 1. 有能立刻围成方格的边就必抓；
 * 2. 否则随机挑一条未画的边，如果它会送对手一个「只差一边」的方格就重挑，
 *    最多试 5 次，仍不合适就落子，避免 AI 永远按扫描顺序固定开局。
 */
export class DotsAndBoxesRandomController implements PlayerController<
  DotsAndBoxesObservation,
  DotsAndBoxesAction
> {
  readonly id: PlayerId

  constructor(id: PlayerId) {
    this.id = id
  }

  async decide(ctx: DecideContext<DotsAndBoxesObservation, DotsAndBoxesAction>): Promise<DotsAndBoxesAction> {
    if (!isDotsAndBoxesSeat(ctx.playerId)) {
      throw new Error(`DotsAndBoxesRandomController 只接受红 / 蓝 / 绿 / 黄席位，收到 ${ctx.playerId}`)
    }
    if (ctx.legalActions.length === 0) {
      throw new Error(`玩家 ${ctx.playerId} 没有可行动作`)
    }

    const { observation } = ctx
    const completion = ctx.legalActions.find(
      (action) => completedBoxesIfDrawn(observation, toEdge(action)).length > 0,
    )
    if (completion !== undefined) {
      return completion
    }

    let candidate = ctx.legalActions[0]
    for (let attempt = 0; attempt < MAX_SAFE_TRIES; attempt += 1) {
      candidate = ctx.legalActions[Math.floor(Math.random() * ctx.legalActions.length)]
      if (!giftsNextPlayer(observation, toEdge(candidate))) {
        return candidate
      }
    }
    return candidate
  }
}

function toEdge(action: DotsAndBoxesAction): DotsEdge {
  return { orientation: action.orientation, row: action.row, col: action.col }
}

/** 画下这条边后，是否会有未归属方格变成「只差一边」，即把得分机会送给下一位玩家。 */
function giftsNextPlayer(observation: DotsAndBoxesObservation, edge: DotsEdge): boolean {
  return adjacentBoxesOfEdge(observation.boxSize, edge).some(
    (box) => boxOwner(observation, box) === null && countBoxEdges(observation, box) === 2,
  )
}