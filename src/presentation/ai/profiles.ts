import { z } from 'zod'
import { checkEndpoint } from '@/shared/utils/endpoint'
import type { LlmProviderKind } from '@/integrations/llm/types'
import {
  LLM_PROVIDER_KINDS,
  type AiSeatConfig,
} from '@/presentation/match-setup/ai-config'

const STORAGE_KEY = 'table.ai.profiles.v1'

export const AI_PROFILE_KINDS = ['cloud-llm', 'local-llm', 'http-decide'] as const
export type AiProfileKind = (typeof AI_PROFILE_KINDS)[number]

interface ProfileBase {
  readonly id: string
  readonly name: string
  /** 完整请求地址；不会追加任何路径。 */
  readonly endpoint: string
  readonly timeoutMs: number
  readonly credentialId: string | null
  readonly updatedAt: number
}

export interface CloudLlmProfile extends ProfileBase {
  readonly kind: 'cloud-llm'
  readonly provider: LlmProviderKind
  readonly model: string
}

export interface LocalLlmProfile extends ProfileBase {
  readonly kind: 'local-llm'
  readonly model: string
}

export interface HttpDecideProfile extends ProfileBase {
  readonly kind: 'http-decide'
}

export type AiProfile = CloudLlmProfile | LocalLlmProfile | HttpDecideProfile

export interface AiProfileDraft {
  readonly id?: string
  readonly kind: AiProfileKind
  readonly name: string
  readonly endpoint: string
  readonly provider?: LlmProviderKind
  readonly model: string
  readonly timeoutMs: number
  readonly credentialId: string | null
}

const endpointSchema = z
  .string()
  .trim()
  .min(1, '完整请求地址不能为空')
  .max(2048)
  .superRefine((value, ctx) => {
    const check = checkEndpoint(value, { allowPath: true })
    if (!check.ok) {
      ctx.addIssue({ code: 'custom', message: check.message ?? '地址不合法' })
    }
  })

const timeoutSchema = z.number().int().min(1_000).max(120_000)

const baseSchema = {
  id: z.string().min(1).max(120),
  name: z.string().trim().min(1, '名称不能为空').max(80),
  endpoint: endpointSchema,
  timeoutMs: timeoutSchema,
  credentialId: z.string().min(1).max(120).nullable(),
  updatedAt: z.number().int().nonnegative(),
}

const profileSchema = z.discriminatedUnion('kind', [
  z.object({
    ...baseSchema,
    kind: z.literal('cloud-llm'),
    provider: z.enum(LLM_PROVIDER_KINDS),
    model: z.string().trim().min(1, '模型名称不能为空').max(160),
  }),
  z.object({
    ...baseSchema,
    kind: z.literal('local-llm'),
    model: z.string().trim().min(1, '模型名称不能为空').max(160),
  }),
  z.object({
    ...baseSchema,
    kind: z.literal('http-decide'),
  }),
])

const librarySchema = z.object({
  version: z.literal(1),
  entries: z.array(profileSchema).max(100),
})

const listeners = new Set<() => void>()
let version = 0

function emit(): void {
  version += 1
  for (const listener of listeners) {
    listener()
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      emit()
    }
  })
}

export function subscribeProfiles(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function profilesVersion(): number {
  return version
}

export function readProfiles(kind?: AiProfileKind): readonly AiProfile[] {
  const all = readAll()
  return kind === undefined ? all : all.filter((profile) => profile.kind === kind)
}

export function getProfile(id: string): AiProfile | undefined {
  return readAll().find((profile) => profile.id === id)
}

/**
 * 新增或更新一个模型配置。Key 仍由 credential-store 持有；
 * 保存 profile 时 UI 会把对应凭据标记为「记住」，因此刷新后仍可用。
 */
export function saveProfile(draft: AiProfileDraft): AiProfile {
  const updatedAt = Date.now()
  const base = {
    id: draft.id ?? createId(),
    name: draft.name.trim(),
    endpoint: draft.endpoint.trim(),
    timeoutMs: draft.timeoutMs,
    credentialId: draft.credentialId,
    updatedAt,
  }
  let candidate: unknown
  if (draft.kind === 'cloud-llm') {
    candidate = {
      ...base,
      kind: 'cloud-llm',
      provider: draft.provider ?? 'openai-compatible',
      model: draft.model.trim(),
    }
  } else if (draft.kind === 'local-llm') {
    candidate = { ...base, kind: 'local-llm', model: draft.model.trim() }
  } else {
    candidate = { ...base, kind: 'http-decide' }
  }

  const parsed = profileSchema.safeParse(candidate)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join('；'))
  }

  const entry = parsed.data
  const next = [entry, ...readAll().filter((profile) => profile.id !== entry.id)].slice(0, 100)
  writeAll(next)
  emit()
  return entry
}

export function deleteProfile(id: string): void {
  const next = readAll().filter((profile) => profile.id !== id)
  writeAll(next)
  emit()
}

export function clearProfileCredentials(): void {
  const next = readAll().map((profile) => ({ ...profile, credentialId: null }))
  writeAll(next)
  emit()
}

export function clearProfiles(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY)
  }
  emit()
}

/** 把 profile 转成席位内的运行时快照；编辑 profile 不会改动已保存的对局。 */
export function profileToSeatConfig(profile: AiProfile): AiSeatConfig {
  if (profile.kind === 'cloud-llm') {
    return {
      kind: 'cloud-llm',
      provider: profile.provider,
      endpoint: profile.endpoint,
      model: profile.model,
      timeoutMs: profile.timeoutMs,
      credentialId: profile.credentialId,
    }
  }
  if (profile.kind === 'local-llm') {
    return {
      kind: 'local-llm',
      endpoint: profile.endpoint,
      model: profile.model,
      timeoutMs: profile.timeoutMs,
      credentialId: profile.credentialId,
    }
  }
  return {
    kind: 'http-decide',
    endpoint: profile.endpoint,
    timeoutMs: profile.timeoutMs,
    credentialId: profile.credentialId,
  }
}

/** 判断当前席位配置是否与某个 profile 完全一致，用于下拉框回显。 */
export function matchingProfileId(
  config: AiSeatConfig | undefined,
  profiles: readonly AiProfile[],
): string | null {
  if (config === undefined || config.kind === 'builtin' || config.kind === 'javascript') {
    return null
  }
  const match = profiles.find((profile) => {
    if (profile.kind !== config.kind) {
      return false
    }
    if (profile.endpoint !== config.endpoint || profile.timeoutMs !== config.timeoutMs) {
      return false
    }
    if (profile.credentialId !== config.credentialId) {
      return false
    }
    if (profile.kind === 'cloud-llm' && config.kind === 'cloud-llm') {
      return profile.provider === config.provider && profile.model === config.model
    }
    if (profile.kind === 'local-llm' && config.kind === 'local-llm') {
      return profile.model === config.model
    }
    return true
  })
  return match?.id ?? null
}

function readAll(): readonly AiProfile[] {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      return []
    }
    const parsed = librarySchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data.entries : []
  } catch {
    return []
  }
}

function writeAll(entries: readonly AiProfile[]): void {
  if (typeof window === 'undefined') {
    return
  }
  const payload = { version: 1 as const, entries }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

function createId(): string {
  const cryptoApi = globalThis.crypto
  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }
  return `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}