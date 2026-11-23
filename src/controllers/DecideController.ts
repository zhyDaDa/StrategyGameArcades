import { isSameAction } from '@/core/contracts/action'
import type { DecideContext, PlayerController, PlayerId } from '@/core/contracts/player'
import type { DecideClient } from '@/integrations/decide/types'
import { throwIfAborted } from './abort'

export interface DecideControllerOptions<A> {
  readonly id: PlayerId
  readonly gameId: string
  readonly client: DecideClient
  readonly parseAction: (raw: unknown) => A
}

/**
 * 自定义 localhost 智能体：把公开 Observation + 合法动作 POST 给用户本机服务，
 * 返回的动作仍由 Controller 校验合法性，再交给 Session。
 */
export class DecideController<O, A> implements PlayerController<O, A> {
  readonly id: PlayerId

  private readonly options: DecideControllerOptions<A>

  constructor(options: DecideControllerOptions<A>) {
    this.id = options.id
    this.options = options
  }

  async decide(ctx: DecideContext<O, A>): Promise<A> {
    if (ctx.legalActions.length === 0) {
      throw new Error(`玩家 ${ctx.playerId} 没有可行动作。`)
    }
    const raw = await this.options.client.request(
      {
        game: this.options.gameId,
        observation: ctx.observation,
        legalActions: ctx.legalActions,
        turn: ctx.turn,
        playerId: ctx.playerId,
      },
      ctx.signal,
    )
    throwIfAborted(ctx.signal)

    let action: A
    try {
      action = this.options.parseAction(raw)
    } catch (error) {
      throw new Error(
        `本地智能体返回的动作不符合游戏结构：${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      )
    }
    if (!ctx.legalActions.some((legal) => isSameAction(legal, action))) {
      throw new Error(
        `本地智能体返回的动作不在当前合法动作集合中：${JSON.stringify(raw).slice(0, 200)}`,
      )
    }
    return action
  }
}