import { checkEndpoint } from '@/shared/utils/endpoint'
import { withTimeout } from '../http/signal'
import {
  DECIDE_PROTOCOL_VERSION,
  DecideRequestError,
  type DecideClient,
  type DecideRequest,
  type DecideResponse,
} from './types'

export interface HttpDecideClientOptions {
  readonly endpoint: string
  readonly token: string
  readonly timeoutMs: number
}

/** 自定义 localhost /decide 协议客户端；只发棋局公开数据，不接受任意代理绕过。 */
export class HttpDecideClient implements DecideClient {
  readonly endpoint: string

  private readonly token: string
  private readonly timeoutMs: number

  constructor(options: HttpDecideClientOptions) {
    const check = checkEndpoint(options.endpoint, { allowPath: true })
    if (!check.ok) {
      throw new DecideRequestError('invalid-url', check.message ?? '端点不合法。')
    }
    this.endpoint = options.endpoint.trim()
    this.token = options.token.trim()
    this.timeoutMs = options.timeoutMs
  }

  async request(
    input: Omit<DecideRequest, 'protocolVersion'>,
    signal: AbortSignal,
  ): Promise<unknown> {
    const timed = withTimeout(signal, this.timeoutMs)
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }
      if (this.token !== '') {
        headers.Authorization = `Bearer ${this.token}`
      }
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ protocolVersion: DECIDE_PROTOCOL_VERSION, ...input }),
        signal: timed.signal,
      })
      if (!response.ok) {
        throw httpError(response.status, await response.text())
      }
      const json: unknown = await readJson(response)
      if (!isDecideResponse(json)) {
        throw new DecideRequestError('bad-response', '响应必须是 {"action": ...}。')
      }
      return json.action
    } catch (error) {
      throw mapError(error, signal, timed.timedOut())
    } finally {
      timed.dispose()
    }
  }
}

function isDecideResponse(value: unknown): value is DecideResponse {
  return typeof value === 'object' && value !== null && 'action' in value
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch (error) {
    throw new DecideRequestError('bad-response', '本地服务返回的不是合法 JSON。', {
      detail: error instanceof Error ? error.message : null,
    })
  }
}

function httpError(status: number, body: string): DecideRequestError {
  const detail = body.slice(0, 200)
  if (status === 401) {
    return new DecideRequestError('unauthorized', '认证失败（401）。', { status, detail })
  }
  if (status === 403) {
    return new DecideRequestError('forbidden', '访问被拒绝（403）。', { status, detail })
  }
  if (status === 404) {
    return new DecideRequestError('not-found', '端点不存在（404）。', { status, detail })
  }
  if (status === 429) {
    return new DecideRequestError('rate-limited', '请求过于频繁（429）。', { status, detail })
  }
  if (status >= 500) {
    return new DecideRequestError('server-error', `本地服务内部错误（${status}）。`, { status, detail })
  }
  return new DecideRequestError('bad-response', `本地服务返回 HTTP ${status}。`, { status, detail })
}

function mapError(error: unknown, signal: AbortSignal, timedOut: boolean): Error {
  if (error instanceof DecideRequestError) {
    return error
  }
  if (timedOut) {
    return new DecideRequestError('timeout', '本地智能体请求超时。', {
      detail: error instanceof Error ? error.message : null,
    })
  }
  if (signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
    return error instanceof Error ? error : new DecideRequestError('aborted', '请求已取消。')
  }
  return new DecideRequestError(
    'unreachable',
    '无法连接本地智能体：可能是服务未启动、CORS 未放行或浏览器阻止了本地网络访问。',
    { detail: error instanceof Error ? error.message : String(error) },
  )
}