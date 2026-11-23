import { DEFAULT_AI_TIMEOUT_MS } from '@/presentation/match-setup/ai-config'
import type { AiProfile, AiProfileDraft, AiProfileKind } from './profiles'

export const AI_PROFILE_KIND_LABELS: Record<AiProfileKind, string> = {
  'cloud-llm': '云端大模型',
  'local-llm': 'localhost 大模型',
  'http-decide': '自定义 /decide',
}

export const AI_PROFILE_KIND_DESCRIPTIONS: Record<AiProfileKind, string> = {
  'cloud-llm': 'OpenAI 兼容或 Anthropic Messages 接口，使用你自己的 Key。',
  'local-llm': 'Ollama / LM Studio 等本机 OpenAI 兼容服务。',
  'http-decide': '你自己的本机决策服务，返回 legalActions 中的一个动作。',
}

export const PROVIDER_PRESETS = {
  'openai-compatible': {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4.1-mini',
  },
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-5-5',
  },
  'local-ollama': {
    endpoint: 'http://127.0.0.1:11434/v1/chat/completions',
    model: 'qwen2.5:7b',
  },
  'local-lmstudio': {
    endpoint: 'http://127.0.0.1:1234/v1/chat/completions',
    model: 'local-model',
  },
} as const

export type ProviderPresetKey = keyof typeof PROVIDER_PRESETS

export function emptyProfileDraft(kind: AiProfileKind = 'cloud-llm'): AiProfileDraft {
  if (kind === 'cloud-llm') {
    return {
      kind,
      name: '',
      endpoint: PROVIDER_PRESETS['openai-compatible'].endpoint,
      provider: 'openai-compatible',
      model: PROVIDER_PRESETS['openai-compatible'].model,
      timeoutMs: DEFAULT_AI_TIMEOUT_MS,
      credentialId: null,
    }
  }
  if (kind === 'local-llm') {
    return {
      kind,
      name: '',
      endpoint: PROVIDER_PRESETS['local-ollama'].endpoint,
      model: PROVIDER_PRESETS['local-ollama'].model,
      timeoutMs: DEFAULT_AI_TIMEOUT_MS,
      credentialId: null,
    }
  }
  return {
    kind,
    name: '',
    endpoint: 'http://127.0.0.1:8787/decide',
    model: '',
    timeoutMs: DEFAULT_AI_TIMEOUT_MS,
    credentialId: null,
  }
}

export function toProfileDraft(profile: AiProfile): AiProfileDraft {
  return {
    id: profile.id,
    kind: profile.kind,
    name: profile.name,
    endpoint: profile.endpoint,
    provider: profile.kind === 'cloud-llm' ? profile.provider : undefined,
    model: profile.kind === 'http-decide' ? '' : profile.model,
    timeoutMs: profile.timeoutMs,
    credentialId: profile.credentialId,
  }
}

export function profileEndpointHint(kind: AiProfileKind): string {
  if (kind === 'cloud-llm') {
    return '完整的 Chat Completions / Messages 地址，例如 https://api.openai.com/v1/chat/completions。本站不会再追加路径。'
  }
  if (kind === 'local-llm') {
    return '完整的本地请求地址，例如 http://127.0.0.1:11434/v1/chat/completions。'
  }
  return '完整的 /decide 地址，例如 http://127.0.0.1:8787/decide。'
}