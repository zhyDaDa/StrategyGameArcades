import { z } from 'zod'
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
}

/** OpenAI 兼容 Chat Completions 端点（OpenAI / OpenRouter / 本地 Ollama 等）。 */
export class OpenAICompatClient implements LlmClient {
  readonly id = 'openai-compatible'
  readonly model: string

  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(options: OpenAICompatOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.apiKey = options.apiKey
    this.model = options.model
  }

  async complete(messages: readonly LlmChatMessage[], signal: AbortSignal): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, messages }),
      signal,
    })
    if (!response.ok) {
      const body = await response.text()
      throw new Error(`模型服务返回 ${response.status}：${body.slice(0, 200)}`)
    }
    const json: unknown = await response.json()
    const parsed = completionSchema.parse(json)
    const content = parsed.choices[0]?.message.content
    if (typeof content !== 'string' || content.trim() === '') {
      throw new Error('模型服务未返回文本内容。')
    }
    return content
  }
}