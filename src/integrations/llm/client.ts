import { checkEndpoint } from '@/shared/utils/endpoint'
import { LlmRequestError } from './errors'
import { AnthropicClient } from './providers/anthropic'
import { OpenAICompatClient } from './providers/openai-compat'
import type { LlmClient, LlmProviderKind } from './types'

export interface CreateLlmClientInput {
  readonly provider: LlmProviderKind
  readonly endpoint: string
  readonly apiKey: string
  readonly model: string
  readonly timeoutMs: number
}

export function createLlmClient(input: CreateLlmClientInput): LlmClient {
  const endpoint = checkEndpoint(input.endpoint, { allowPath: true })
  if (!endpoint.ok) {
    throw new LlmRequestError('invalid-url', endpoint.message ?? '接口地址不合法。')
  }
  if (input.provider === 'anthropic') {
    return new AnthropicClient({
      endpoint: input.endpoint,
      apiKey: input.apiKey,
      model: input.model,
      timeoutMs: input.timeoutMs,
    })
  }
  return new OpenAICompatClient({
    endpoint: input.endpoint,
    apiKey: input.apiKey,
    model: input.model,
    timeoutMs: input.timeoutMs,
  })
}