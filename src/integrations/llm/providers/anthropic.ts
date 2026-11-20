import { z } from 'zod'
import type { LlmChatMessage, LlmClient } from '../types'

const messageSchema = z.object({
  content: z.array(z.object({ type: z.literal('text'), text: z.string() })),
})

export interface AnthropicOptions {
  readonly baseUrl: string
  readonly apiKey: string
  readonly model: string
}

/** Anthropic Messages API（纯静态部署 + 用户自带 Key 需显式声明浏览器直连）。 */
export class AnthropicClient implements LlmClient {
  readonly id = 'anthropic'
  readonly model: string

  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(options: AnthropicOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.apiKey = options.apiKey
    this.model = options.model
  }

  async complete(messages: readonly LlmChatMessage[], signal: AbortSignal): Promise<string> {
    const system = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n')
    const rest = messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({ role: message.role, content: message.content }))

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: this.model, max_tokens: 1024, system, messages: rest }),
      signal,
    })
    if (!response.ok) {
      const body = await response.text()
      throw new Error(`模型服务返回 ${response.status}：${body.slice(0, 200)}`)
    }
    const json: unknown = await response.json()
    const parsed = messageSchema.parse(json)
    const text = parsed.content.map((block) => block.text).join('')
    if (text.trim() === '') {
      throw new Error('模型服务未返回文本内容。')
    }
    return text
  }
}