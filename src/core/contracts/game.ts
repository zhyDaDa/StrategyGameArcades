import type { PlayerId } from './player'
import type { GameResult } from './result'

/** 一次已提交行为的产出：新的权威状态 + 已发生的领域事件。 */
export interface Transition<S, E> {
  readonly state: S
  readonly events: readonly E[]
}

/**
 * 游戏规则契约。`S/A/O/E` 分别是 State / Action / Observation / Event，
 * 全部是 JSON 安全数据（不含函数、Date、Map、Set、ReactNode 等）。
 */
export interface GameDefinition<S, A, O, E> {
  readonly id: string
  readonly rulesVersion: number

  createInitialState(): S
  getCurrentPlayer(state: Readonly<S>): PlayerId | null
  getLegalActions(state: Readonly<S>, playerId: PlayerId): readonly A[]
  observe(state: Readonly<S>, playerId: PlayerId): O
  reduce(state: Readonly<S>, playerId: PlayerId, action: A): Transition<S, E>
  getResult(state: Readonly<S>): GameResult | null
  serialize(state: S): string
  restore(raw: string): S
}

/**
 * GameSession 实际依赖的能力：在规则契约之上，
 * 附带了运行时校验（Schema parse）与合法性判断入口。
 */
export interface GameRuntime<S, A, O, E> extends GameDefinition<S, A, O, E> {
  parseAction(raw: unknown): A
  parseState(raw: unknown): S
  isActionLegal(state: Readonly<S>, playerId: PlayerId, action: A): boolean
}