export type LlmChatRole = 'system' | 'user' | 'assistant'

export interface LlmChatMessage {
  readonly role: LlmChatRole
  readonly content: string
}

/** 模型客户端适配器：由 `integrations/llm` 实现，通过注入提供给 Controller。 */
export interface LlmClient {
  readonly id: string
  readonly model: string
  complete(messages: readonly LlmChatMessage[], signal: AbortSignal): Promise<string>
}

export const LLM_PROVIDER_KINDS = ['openai-compatible', 'anthropic'] as const
export type LlmProviderKind = (typeof LLM_PROVIDER_KINDS)[number]