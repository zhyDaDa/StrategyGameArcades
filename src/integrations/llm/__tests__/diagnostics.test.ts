import { afterEach, describe, expect, it, vi } from 'vitest'
import { testLlmConnection } from '../diagnostics'

const config = {
  provider: 'openai-compatible' as const,
  endpoint: 'https://api.example.com/v1/chat/completions',
  apiKey: 'sk-secret-value',
  model: 'test-model',
  timeoutMs: 30_000,
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('testLlmConnection', () => {
  it('真实返回推理结果才算成功', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ choices: [{ message: { content: 'OK' } }] })),
    )
    const result = await testLlmConnection(config, new AbortController().signal)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.reply).toBe('OK')
    }
  })

  it('401 映射为认证失败', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'bad key' }, 401)))
    const result = await testLlmConnection(config, new AbortController().signal)
    expect(result).toMatchObject({ ok: false, code: 'unauthorized', status: 401 })
  })

  it('404 提示端点或模型不存在', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 404)))
    const result = await testLlmConnection(config, new AbortController().signal)
    expect(result).toMatchObject({ ok: false, code: 'not-found', status: 404 })
  })

  it('429 映射为额度限制', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 429)))
    const result = await testLlmConnection(config, new AbortController().signal)
    expect(result).toMatchObject({ ok: false, code: 'rate-limited' })
  })

  it('响应结构不符不会被当作成功', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ result: 'nope' })))
    const result = await testLlmConnection(config, new AbortController().signal)
    expect(result).toMatchObject({ ok: false, code: 'bad-response' })
  })

  it('非 JSON 响应映射为格式错误而不是网络错误', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>not json</html>', { status: 200 })),
    )
    const result = await testLlmConnection(config, new AbortController().signal)
    expect(result).toMatchObject({ ok: false, code: 'bad-response' })
  })

  it('网络错误提示 CORS / 不可达', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    const result = await testLlmConnection(config, new AbortController().signal)
    expect(result).toMatchObject({ ok: false, code: 'cors-or-unreachable' })
  })

  it('超时映射为 timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new Error('aborted'))
          })
        })
      }),
    )
    const result = await testLlmConnection(
      { ...config, timeoutMs: 20 },
      new AbortController().signal,
    )
    expect(result).toMatchObject({ ok: false, code: 'timeout' })
  })

  it('错误信息不包含 API Key', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'denied' }, 403)))
    const result = await testLlmConnection(config, new AbortController().signal)
    const text = JSON.stringify(result)
    expect(text).not.toContain(config.apiKey)
  })
})