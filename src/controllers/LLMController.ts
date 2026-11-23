import type { DecideContext, PlayerController, PlayerId } from '@/core/contracts/player'
import { isSameAction } from '@/core/contracts/action'
import type { LlmChatMessage, LlmClient } from '@/integrations/llm/types'
import { throwIfAborted } from './abort'

export interface LlmControllerOptions<A> {
  readonly id: PlayerId
  readonly client: LlmClient
  readonly gameName: string
  readonly rulesSummary: string
  /** 把模型输出的 JSON 解析成结构化 Action；解析失败应抛错。 */
  readonly parseAction: (raw: unknown) => A
  readonly maxRetries?: number
}

/**
 * LLM 玩家：把 Observation + 合法 Action 交给模型，解析并校验其返回的
 * 结构化 Action。模型只能提供候选 Action，最终仍由 Session 统一校验执行。
 */
export class LLMController<O, A> implements PlayerController<O, A> {
  readonly id: PlayerId

  private readonly options: LlmControllerOptions<A>

  constructor(options: LlmControllerOptions<A>) {
    this.id = options.id
    this.options = options
  }

  async decide(ctx: DecideContext<O, A>): Promise<A> {
    if (ctx.legalActions.length === 0) {
      throw new Error(`玩家 ${ctx.playerId} 没有可行动作。`)
    }
    const maxRetries = this.options.maxRetries ?? 1
    let lastError: unknown = null
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      throwIfAborted(ctx.signal)
      try {
        const messages = buildMessages(
          this.options.gameName,
          this.options.rulesSummary,
          ctx.observation,
          ctx.legalActions,
        )
        const text = await this.options.client.complete(messages, ctx.signal)
        throwIfAborted(ctx.signal)

        const action = this.options.parseAction(parseJsonResponse(text))
        if (ctx.legalActions.some((legal) => isSameAction(legal, action))) {
          return action
        }
        lastError = new Error('模型返回的动作不在合法动作集合中。')
      } catch (err) {
        // 取消必须立刻向上抛，不能当成「模型输出了坏结果」再重试一次。
        throwIfAborted(ctx.signal)
        lastError = err
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError))
  }
}

function buildMessages(
  gameName: string,
  rulesSummary: string,
  observation: unknown,
  legalActions: readonly unknown[],
): LlmChatMessage[] {
  return [
    {
      role: 'system',
      content: `你正在玩「${gameName}」。规则：${rulesSummary}。你只输出一个 JSON 对象作为你的动作，必须属于给定的合法动作之一，不要输出任何解释或额外文字。`,
    },
    {
      role: 'user',
      content: `当前局面（JSON）：${JSON.stringify(observation)}\n你的合法动作（JSON 数组）：${JSON.stringify(legalActions)}`,
    },
  ]
}

function parseJsonResponse(text: string): unknown {
  const trimmed = text.trim()
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed)
  const body = match !== null ? match[1] : trimmed
  try {
    const parsed: unknown = JSON.parse(body)
    return parsed
  } catch {
    throw new Error(`无法将模型输出解析为 JSON：${trimmed.slice(0, 200)}`)
  }
}