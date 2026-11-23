import { afterEach, describe, expect, it, vi } from 'vitest'
import { testDecideEndpoint } from '../diagnostics'

const input = {
  endpoint: 'http://127.0.0.1:8787/decide',
  token: '',
  timeoutMs: 30_000,
  gameId: 'gomoku',
  observation: { size: 15 },
  legalActions: [
    { type: 'place', row: 0, col: 0 },
    { type: 'place', row: 0, col: 1 },
  ],
  turn: 0,
  playerId: 'black',
  parseAction: (raw: unknown) => {
    if (typeof raw !== 'object' || raw === null || !('type' in raw)) {
      throw new Error('不是动作')
    }
    return raw
  },
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

describe('testDecideEndpoint', () => {
  it('可达且返回合法动作才算成功', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ action: { type: 'place', row: 0, col: 1 } })),
    )
    const result = await testDecideEndpoint(input, new AbortController().signal)
    expect(result.ok).toBe(true)
  })

  it('返回非法动作显式失败', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ action: { type: 'place', row: 99, col: 99 } })),
    )
    const result = await testDecideEndpoint(input, new AbortController().signal)
    expect(result).toMatchObject({ ok: false, code: 'bad-response' })
  })

  it('响应缺少 action 显式失败', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ok: true })))
    const result = await testDecideEndpoint(input, new AbortController().signal)
    expect(result).toMatchObject({ ok: false, code: 'bad-response' })
  })

  it('非 JSON 响应映射为格式错误而不是不可达', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('plain text', { status: 200 })),
    )
    const result = await testDecideEndpoint(input, new AbortController().signal)
    expect(result).toMatchObject({ ok: false, code: 'bad-response' })
  })

  it('403 映射为拒绝访问', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 403)))
    const result = await testDecideEndpoint(input, new AbortController().signal)
    expect(result).toMatchObject({ ok: false, code: 'forbidden', status: 403 })
  })

  it('不可达提示本地网络 / CORS', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    const result = await testDecideEndpoint(input, new AbortController().signal)
    expect(result).toMatchObject({ ok: false, code: 'unreachable' })
  })
})