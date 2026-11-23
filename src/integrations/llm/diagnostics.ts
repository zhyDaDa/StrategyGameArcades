import { createLlmClient, type CreateLlmClientInput } from './client'
import {
  LLM_DIAGNOSTIC_COPY,
  LlmRequestError,
  type LlmErrorCode,
} from './errors'

export type ConnectionTestResult =
  | {
      readonly ok: true
      readonly latencyMs: number
      readonly reply: string
    }
  | {
      readonly ok: false
      readonly code: LlmErrorCode
      readonly title: string
      readonly hint: string
      readonly detail: string | null
      readonly status: number | null
    }

/**
 * 连接测试会真的发一次极小的补全请求——只有实际推理成功才算连通。
 * 失败按 HTTP 状态 / 网络错误分类，不把 401、429、CORS 混成同一句「连接失败」。
 */
export async function testLlmConnection(
  input: CreateLlmClientInput,
  signal: AbortSignal,
): Promise<ConnectionTestResult> {
  const startedAt = Date.now()
  try {
    const client = createLlmClient(input)
    const reply = await client.complete(
      [
        { role: 'system', content: 'You are a connectivity probe. Reply with exactly: OK' },
        { role: 'user', content: 'ping' },
      ],
      signal,
    )
    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
      reply: reply.trim().slice(0, 80),
    }
  } catch (error) {
    return explainLlmError(error, signal)
  }
}

export function explainLlmError(
  error: unknown,
  signal?: AbortSignal,
): Extract<ConnectionTestResult, { ok: false }> {
  if (error instanceof LlmRequestError) {
    const copy = LLM_DIAGNOSTIC_COPY[error.code]
    return {
      ok: false,
      code: error.code,
      title: copy.title,
      hint: copy.hint,
      detail: error.detail,
      status: error.status,
    }
  }
  if (signal?.aborted) {
    const copy = LLM_DIAGNOSTIC_COPY.aborted
    return {
      ok: false,
      code: 'aborted',
      title: copy.title,
      hint: copy.hint,
      detail: null,
      status: null,
    }
  }
  const copy = LLM_DIAGNOSTIC_COPY.unknown
  return {
    ok: false,
    code: 'unknown',
    title: copy.title,
    hint: copy.hint,
    detail: error instanceof Error ? error.message : String(error),
    status: null,
  }
}