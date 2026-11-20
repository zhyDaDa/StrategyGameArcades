import type { ZodType } from 'zod'
import { isSameAction } from '../contracts/action'
import type { GameResult } from '../contracts/result'
import type { PlayerId } from '../contracts/player'
import type { GameRuntime, Transition } from '../contracts/game'
import { createSaveEnvelopeSchema, type SaveEnvelope } from '../persistence/save-envelope'
import { decodeSave, encodeSave } from '../persistence/codec'

export interface BaseGameConfig<S, A> {
  readonly id: string
  readonly rulesVersion: number
  readonly stateSchema: ZodType<S>
  readonly actionSchema: ZodType<A>
}

/**
 * 所有游戏的抽象基类。统一了 ID / 规则版本、Schema 校验入口，
 * 以及默认的序列化 / 恢复（套 gameId + rulesVersion + state 封套）。
 * 不包含 React、动画、AI、DOM，也不包含任何具体游戏的胜负判定。
 */
export abstract class BaseGame<S, A, O, E> implements GameRuntime<S, A, O, E> {
  readonly id: string
  readonly rulesVersion: number

  protected readonly stateSchema: ZodType<S>
  protected readonly actionSchema: ZodType<A>

  constructor(config: BaseGameConfig<S, A>) {
    this.id = config.id
    this.rulesVersion = config.rulesVersion
    this.stateSchema = config.stateSchema
    this.actionSchema = config.actionSchema
  }

  abstract createInitialState(): S
  abstract getCurrentPlayer(state: Readonly<S>): PlayerId | null
  abstract getLegalActions(state: Readonly<S>, playerId: PlayerId): readonly A[]
  abstract observe(state: Readonly<S>, playerId: PlayerId): O
  abstract reduce(state: Readonly<S>, playerId: PlayerId, action: A): Transition<S, E>
  abstract getResult(state: Readonly<S>): GameResult | null

  parseAction(raw: unknown): A {
    return this.actionSchema.parse(raw)
  }

  parseState(raw: unknown): S {
    return this.stateSchema.parse(raw)
  }

  /**
   * 默认合法性判断：把候选 Action 规范化后与合法动作集合比较。
   * 对于动作空间小的棋盘游戏，游戏子类可用更精确的规则谓词覆盖此方法。
   */
  isActionLegal(state: Readonly<S>, playerId: PlayerId, action: A): boolean {
    return this.getLegalActions(state, playerId).some((legal) => isSameAction(legal, action))
  }

  serialize(state: S): string {
    const envelope: SaveEnvelope<S> = {
      gameId: this.id,
      rulesVersion: this.rulesVersion,
      state,
    }
    return encodeSave(envelope)
  }

  restore(raw: string): S {
    const schema = createSaveEnvelopeSchema(this.stateSchema, this.id, this.rulesVersion)
    return decodeSave(raw, schema).state
  }
}