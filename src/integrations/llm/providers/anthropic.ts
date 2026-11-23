import { z } from 'zod'
import { withTimeout } from '../../http/signal'
import {
  LlmRequestError,
  isAbortLike,
  llmHttpError,
  llmNetworkError,
} from '../errors'
import type { LlmChatMessage, LlmClient } from '../types'

const messageSchema = z.object({
  content: z.array(z.object({ type: z.literal('text'), text: z.string() })),
})

export interface AnthropicOptions {
  readonly endpoint: string
  readonly apiKey: string
  readonly model: string
  readonly timeoutMs: number
}

/** Anthropic Messages API；endpoint 必须是完整请求地址（…/v1/messages）。 */
export class AnthropicClient implements LlmClient {
  readonly id = 'anthropic'
  readonly model: string

  private readonly endpoint: string
  private readonly apiKey: string
  private readonly timeoutMs: number

  constructor(options: AnthropicOptions) {
    this.endpoint = options.endpoint
    this.apiKey = options.apiKey.trim()
    this.model = options.model
    this.timeoutMs = options.timeoutMs
  }

  async complete(messages: readonly LlmChatMessage[], signal: AbortSignal): Promise<string> {
    if (this.endpoint === '') {
      throw new LlmRequestError('invalid-config', '接口地址为空。')
    }
    if (this.apiKey === '') {
      throw new LlmRequestError('invalid-config', 'Anthropic 端点必须提供 API Key。')
    }
    if (this.model.trim() === '') {
      throw new LlmRequestError('invalid-config', '模型名称为空。')
    }

    const system = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n')
    const rest = messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({ role: message.role, content: message.content }))

    const timed = withTimeout(signal, this.timeoutMs)
    try {
      const response = await fetch(`${this.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          system,
          messages: rest,
        }),
        signal: timed.signal,
      })
      if (!response.ok) {
        throw llmHttpError(response.status, await response.text())
      }
      const json: unknown = await readJson(response)
      const parsed = messageSchema.safeParse(json)
      if (!parsed.success) {
        throw new LlmRequestError('bad-response', '响应不符合 Anthropic Messages 结构。', {
          detail: parsed.error.message.slice(0, 200),
        })
      }
      const text = parsed.data.content.map((block) => block.text).join('')
      if (text.trim() === '') {
        throw new LlmRequestError('bad-response', '模型服务未返回文本内容。')
      }
      return text
    } catch (error) {
      throw mapRequestError(error, signal, timed.timedOut())
    } finally {
      timed.dispose()
    }
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch (error) {
    throw new LlmRequestError('bad-response', '模型服务返回的不是合法 JSON。', {
      detail: error instanceof Error ? error.message : null,
    })
  }
}

function mapRequestError(error: unknown, signal: AbortSignal, timedOut: boolean): Error {
  if (error instanceof LlmRequestError) {
    return error
  }
  if (timedOut) {
    return new LlmRequestError('timeout', '模型请求超时。', {
      detail: error instanceof Error ? error.message : null,
    })
  }
  if (signal.aborted || isAbortLike(error)) {
    return error instanceof Error ? error : new LlmRequestError('aborted', '请求已取消。')
  }
  return llmNetworkError(error)
}