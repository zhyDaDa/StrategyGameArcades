export type PlayerId = string

export interface DecideContext<O, A> {
  readonly playerId: PlayerId
  readonly observation: Readonly<O>
  readonly legalActions: readonly A[]
  readonly turn: number
  readonly signal: AbortSignal
}

/**
 * 玩家决策者：把 Observation 转成一个 Action。
 * 人类、随机算法、搜索算法、LLM 都遵守同一协议，
 * 且只能看到 Observation，不得绕过规则读取隐藏的完整 State。
 */
export interface PlayerController<O, A> {
  readonly id: PlayerId
  decide(ctx: DecideContext<O, A>): Promise<A>
}