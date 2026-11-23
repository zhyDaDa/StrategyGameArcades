import { isSameAction } from '@/core/contracts/action'
import type { DecideContext, PlayerController, PlayerId } from '@/core/contracts/player'
import type { ScriptRunner } from '@/integrations/script/protocol'
import { throwIfAborted } from './abort'

export interface ScriptControllerOptions<A> {
  readonly id: PlayerId
  readonly gameId: string
  readonly runner: ScriptRunner
  readonly source: string
  readonly timeoutMs: number
  /** 把脚本返回的 JSON 解析成结构化 Action；失败必须抛错。 */
  readonly parseAction: (raw: unknown) => A
}

export class ScriptExecutionError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ScriptExecutionError'
    this.code = code
  }
}

/**
 * 代码策略玩家：用户脚本在 QuickJS 沙箱里执行，只拿到 Observation 与合法动作。
 * 脚本输出不合法时显式报错，绝不回退成随机动作或内置算法。
 */
export class ScriptController<O, A> implements PlayerController<O, A> {
  readonly id: PlayerId

  private readonly options: ScriptControllerOptions<A>

  constructor(options: ScriptControllerOptions<A>) {
    this.id = options.id
    this.options = options
  }

  async decide(ctx: DecideContext<O, A>): Promise<A> {
    if (ctx.legalActions.length === 0) {
      throw new Error(`玩家 ${ctx.playerId} 没有可行动作。`)
    }

    const result = await this.options.runner.run(
      {
        source: this.options.source,
        observation: ctx.observation,
        legalActions: ctx.legalActions,
        context: {
          playerId: ctx.playerId,
          turn: ctx.turn,
          gameId: this.options.gameId,
        },
        timeoutMs: this.options.timeoutMs,
      },
      ctx.signal,
    )

    throwIfAborted(ctx.signal)
    if (!result.ok) {
      const logs = result.logs.length > 0 ? `\n脚本输出：\n${result.logs.join('\n')}` : ''
      throw new ScriptExecutionError(
        result.code,
        `策略执行失败（${result.code}）：${result.message}${logs}`,
      )
    }

    let action: A
    try {
      action = this.options.parseAction(result.action)
    } catch (error) {
      throw new ScriptExecutionError(
        'invalid-action',
        `策略返回的动作不符合游戏结构：${error instanceof Error ? error.message : String(error)}`,
      )
    }

    if (!ctx.legalActions.some((legal) => isSameAction(legal, action))) {
      throw new ScriptExecutionError(
        'illegal-action',
        `策略返回的动作不在当前合法动作集合中：${JSON.stringify(result.action).slice(0, 200)}`,
      )
    }
    return action
  }
}