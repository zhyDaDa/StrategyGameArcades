import { z } from 'zod'
import { LLM_PROVIDER_KINDS, type LlmProviderKind } from '@/integrations/llm/types'
import { MAX_SCRIPT_LENGTH } from '@/integrations/script/protocol'
import { checkEndpoint } from '@/shared/utils/endpoint'
import type { SeatType } from './types'

/**
 * AI 席位的接入方式。它是席位配置的一部分，会随对局快照持久化，
 * 但**绝不包含 API Key**：凭据只存一个 id，真实密钥由 credential-store 管理。
 */
export const AI_SEAT_KINDS = [
  'builtin',
  'javascript',
  'cloud-llm',
  'local-llm',
  'http-decide',
] as const
export type AiSeatKind = (typeof AI_SEAT_KINDS)[number]

export { LLM_PROVIDER_KINDS, type LlmProviderKind }

export const SCRIPT_LANGUAGES = ['javascript'] as const
export type ScriptLanguage = (typeof SCRIPT_LANGUAGES)[number]

export interface BuiltinAlgorithmConfig {
  readonly kind: 'builtin'
}

export interface JavaScriptStrategyConfig {
  readonly kind: 'javascript'
  readonly language: ScriptLanguage
  readonly name: string
  readonly source: string
  readonly timeoutMs: number
}

export interface CloudLlmConfig {
  readonly kind: 'cloud-llm'
  readonly provider: LlmProviderKind
  /** 完整的请求地址（例如 …/v1/chat/completions）；不会再追加任何路径。 */
  readonly endpoint: string
  readonly model: string
  readonly timeoutMs: number
  /** credential-store 中的密钥 id；null 表示无凭据（例如自建无鉴权端点）。 */
  readonly credentialId: string | null
}

export interface LocalLlmConfig {
  readonly kind: 'local-llm'
  /** 完整的请求地址；不会再追加任何路径。 */
  readonly endpoint: string
  readonly model: string
  readonly timeoutMs: number
  readonly credentialId: string | null
}

export interface HttpDecideConfig {
  readonly kind: 'http-decide'
  /** 完整的 /decide 端点 URL（不会再追加路径）。 */
  readonly endpoint: string
  readonly timeoutMs: number
  readonly credentialId: string | null
}

export type AiSeatConfig =
  | BuiltinAlgorithmConfig
  | JavaScriptStrategyConfig
  | CloudLlmConfig
  | LocalLlmConfig
  | HttpDecideConfig

export const DEFAULT_AI_TIMEOUT_MS = 60_000
export const MIN_AI_TIMEOUT_MS = 1_000
export const MAX_AI_TIMEOUT_MS = 120_000
export const SCRIPT_TIMEOUT_MS = 2_000

export const DEFAULT_JAVASCRIPT_SOURCE = `/**
 * decide(observation, legalActions, context) 必须同步返回一个合法动作。
 * 沙箱内没有 DOM、网络、存储与 API Key。
 */
function decide(observation, legalActions, context) {
  return legalActions[0]
}
`

export const DEFAULT_AI_CONFIG_BY_TYPE: Partial<Record<SeatType, AiSeatConfig>> = {
  algorithm: { kind: 'builtin' },
}

/** 本地回环地址：只有这些主机允许使用 http；其余端点必须 https。 */
function endpointSchema(options: { readonly allowPath: boolean; readonly label: string }) {
  return z
    .string()
    .trim()
    .min(1, `${options.label}不能为空`)
    .superRefine((value, ctx) => {
      const check = checkEndpoint(value, options)
      if (!check.ok) {
        ctx.addIssue({ code: 'custom', message: check.message ?? '端点不合法' })
      }
    })
}

const timeoutSchema = z
  .number()
  .int()
  .min(MIN_AI_TIMEOUT_MS)
  .max(MAX_AI_TIMEOUT_MS)

const credentialIdSchema = z.string().min(1).max(120).nullable()

const builtinSchema = z.object({
  kind: z.literal('builtin'),
})

const javascriptSchema = z.object({
  kind: z.literal('javascript'),
  language: z.enum(SCRIPT_LANGUAGES),
  name: z.string().trim().min(1, '策略名称不能为空').max(80),
  source: z.string().min(1, '策略源码不能为空').max(MAX_SCRIPT_LENGTH, '策略源码过长'),
  timeoutMs: z.number().int().min(100).max(10_000),
})

const cloudLlmSchema = z.object({
  kind: z.literal('cloud-llm'),
  provider: z.enum(LLM_PROVIDER_KINDS),
  endpoint: endpointSchema({ allowPath: true, label: '完整请求地址' }),
  model: z.string().trim().min(1, '模型名称不能为空').max(160),
  timeoutMs: timeoutSchema,
  credentialId: credentialIdSchema,
})

const localLlmSchema = z.object({
  kind: z.literal('local-llm'),
  endpoint: endpointSchema({ allowPath: true, label: '本地服务完整请求地址' }),
  model: z.string().trim().min(1, '模型名称不能为空').max(160),
  timeoutMs: timeoutSchema,
  credentialId: credentialIdSchema,
})

const httpDecideSchema = z.object({
  kind: z.literal('http-decide'),
  endpoint: endpointSchema({ allowPath: true, label: '本地智能体地址' }),
  timeoutMs: timeoutSchema,
  credentialId: credentialIdSchema,
})

export const aiSeatConfigSchema = z.discriminatedUnion('kind', [
  builtinSchema,
  javascriptSchema,
  cloudLlmSchema,
  localLlmSchema,
  httpDecideSchema,
]) as z.ZodType<AiSeatConfig>

/** 某个接入方式允许的 AI 子类型；用于 schema 与 UI 保持同一事实。 */
export const AI_KINDS_BY_SEAT_TYPE: Record<SeatType, readonly AiSeatKind[]> = {
  human: [],
  algorithm: ['builtin', 'javascript'],
  llm: ['cloud-llm'],
  local: ['local-llm', 'http-decide'],
}

/** 生成配置指纹：任何字段变化都必须重新测试后才能开局。 */
export function aiConfigFingerprint(config: AiSeatConfig | undefined): string {
  return JSON.stringify(config ?? null)
}

export function isAiConfigComplete(config: AiSeatConfig | undefined): boolean {
  return config !== undefined && aiSeatConfigSchema.safeParse(config).success
}

export function describeAiConfig(config: AiSeatConfig): string {
  switch (config.kind) {
    case 'builtin':
      return '内置算法'
    case 'javascript':
      return `JavaScript · ${config.name}`
    case 'cloud-llm':
      return `云端模型 · ${config.model}`
    case 'local-llm':
      return `本地模型 · ${config.model}`
    case 'http-decide':
      return '本地智能体 · /decide'
  }
}