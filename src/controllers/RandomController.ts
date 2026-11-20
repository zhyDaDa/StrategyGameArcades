import type { DecideContext, PlayerController, PlayerId } from '@/core/contracts/player'

/**
 * 随机玩家。可选传入种子以获得确定性的随机序列（用于测试与可重放）。
 * 不传种子时使用 Math.random（仅用于非规则的决策本身）。
 */
export class RandomController<O, A> implements PlayerController<O, A> {
  readonly id: PlayerId

  private readonly next: () => number

  constructor(id: PlayerId, seed?: number) {
    this.id = id
    this.next = seed === undefined ? Math.random : createSeededRandom(seed)
  }

  async decide(ctx: DecideContext<O, A>): Promise<A> {
    const action = ctx.legalActions[Math.floor(this.next() * ctx.legalActions.length)]
    if (action === undefined) {
      throw new Error(`玩家 ${ctx.playerId} 无可行动作。`)
    }
    return action
  }
}

/** mulberry32：小而确定的 PRNG。 */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}