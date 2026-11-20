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

export type LlmProviderKind = 'openai-compatible' | 'anthropic'

/** 用户自带的模型端点配置（仅存于用户本地，绝不写入仓库）。 */
export interface LlmClientConfig {
  readonly kind: LlmProviderKind
  readonly name: string
  readonly baseUrl: string
  readonly apiKey: string
  readonly model: string
}