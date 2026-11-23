/** 配置页能提供的一份真实样例局面；用于连接测试与代码策略试运行。 */
export interface AiTestPosition {
  readonly observation: unknown
  readonly legalActions: readonly unknown[]
  readonly turn: number
  readonly playerId: string
}

/**
 * 游戏给 AI 配置面板的最小上下文。
 * `parseAction` 必须是游戏自己的 schema 校验，保证测试与实战使用同一套规则。
 */
export interface AiGameTestContext {
  readonly gameId: string
  readonly gameName: string
  readonly rulesSummary: string
  readonly parseAction: (raw: unknown) => unknown
  createPosition(playerId: string): AiTestPosition
}

interface SampleGame<S, A, O> {
  getCurrentPlayer(state: Readonly<S>): string | null
  getLegalActions(state: Readonly<S>, playerId: string): readonly A[]
  reduce(state: Readonly<S>, playerId: string, action: A): { readonly state: S }
  observe(state: Readonly<S>, playerId: string): O
  getResult(state: Readonly<S>): unknown
}

/**
 * 从初始局面推进到「轮到该席位」的样例局面。
 * 只用于配置页的测试；真实对局永远从 Session 的权威状态出发。
 */
export function createAiTestPosition<S, A, O>(
  game: SampleGame<S, A, O>,
  initialState: S,
  playerId: string,
): AiTestPosition {
  let state = initialState
  let turn = 0
  for (let guard = 0; guard < 32; guard += 1) {
    const current = game.getCurrentPlayer(state)
    if (current === null || current === playerId || game.getResult(state) !== null) {
      break
    }
    const actions = game.getLegalActions(state, current)
    const action = actions[0]
    if (action === undefined) {
      break
    }
    state = game.reduce(state, current, action).state
    turn += 1
  }
  return {
    observation: game.observe(state, playerId),
    legalActions: game.getLegalActions(state, playerId),
    turn,
    playerId,
  }
}