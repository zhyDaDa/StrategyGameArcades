import { z } from 'zod'
import { withTimeout } from '../../http/signal'
import {
  LlmRequestError,
  isAbortLike,
  llmHttpError,
  llmNetworkError,
} from '../errors'
import type { LlmChatMessage, LlmClient } from '../types'

const completionSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({ content: z.unknown() }),
    }),
  ),
})

export interface OpenAICompatOptions {
  readonly baseUrl: string
  readonly apiKey: string
  readonly model: string
  readonly timeoutMs: number
}

/** OpenAI 兼容 Chat Completions 端点（OpenAI / OpenRouter / 本地 Ollama 等）。 */
export class OpenAICompatClient implements LlmClient {
  readonly id = 'openai-compatible'
  readonly model: string

  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly timeoutMs: number

  constructor(options: OpenAICompatOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.apiKey = options.apiKey.trim()
    this.model = options.model
    this.timeoutMs = options.timeoutMs
  }

  async complete(messages: readonly LlmChatMessage[], signal: AbortSignal): Promise<string> {
    if (this.baseUrl === '') {
      throw new LlmRequestError('invalid-config', '接口地址为空。')
    }
    if (this.model.trim() === '') {
      throw new LlmRequestError('invalid-config', '模型名称为空。')
    }

    const timed = withTimeout(signal, this.timeoutMs)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (this.apiKey !== '') {
        headers.Authorization = `Bearer ${this.apiKey}`
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model: this.model, messages }),
        signal: timed.signal,
      })
      if (!response.ok) {
        throw llmHttpError(response.status, await response.text())
      }
      const json: unknown = await readJson(response)
      const parsed = completionSchema.safeParse(json)
      if (!parsed.success) {
        throw new LlmRequestError('bad-response', '响应不符合 Chat Completions 结构。', {
          detail: parsed.error.message.slice(0, 200),
        })
      }
      const content = parsed.data.choices[0]?.message.content
      const text = toText(content)
      if (text === null || text.trim() === '') {
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

/** 兼容部分服务把正文包成字符串的情况；结构不符时显式报错。 */
function toText(content: unknown): string | null {
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    const parts = content
      .map((part: unknown) => {
        if (typeof part === 'object' && part !== null && 'text' in part) {
          const text = (part as { text?: unknown }).text
          return typeof text === 'string' ? text : null
        }
        return null
      })
      .filter((part): part is string => part !== null)
    return parts.length > 0 ? parts.join('') : null
  }
  return null
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