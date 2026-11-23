export const DECIDE_PROTOCOL_VERSION = 1

export interface DecideRequest {
  readonly protocolVersion: typeof DECIDE_PROTOCOL_VERSION
  readonly game: string
  readonly observation: unknown
  readonly legalActions: readonly unknown[]
  readonly turn: number
  readonly playerId: string
}

export interface DecideResponse {
  readonly action: unknown
}

/** 自定义本地智能体的客户端接口；控制器只依赖这个抽象。 */
export interface DecideClient {
  readonly endpoint: string
  request(input: Omit<DecideRequest, 'protocolVersion'>, signal: AbortSignal): Promise<unknown>
}

export const DECIDE_ERROR_CODES = [
  'invalid-url',
  'unreachable',
  'unauthorized',
  'forbidden',
  'not-found',
  'rate-limited',
  'server-error',
  'timeout',
  'bad-response',
  'aborted',
] as const
export type DecideErrorCode = (typeof DECIDE_ERROR_CODES)[number]

export class DecideRequestError extends Error {
  readonly code: DecideErrorCode
  readonly status: number | null
  readonly detail: string | null

  constructor(
    code: DecideErrorCode,
    message: string,
    options: { readonly status?: number | null; readonly detail?: string | null } = {},
  ) {
    super(message)
    this.name = 'DecideRequestError'
    this.code = code
    this.status = options.status ?? null
    this.detail = options.detail ?? null
  }
}

export interface DecideDiagnosticCopy {
  readonly title: string
  readonly hint: string
}

export const DECIDE_DIAGNOSTIC_COPY: Record<DecideErrorCode, DecideDiagnosticCopy> = {
  'invalid-url': {
    title: '地址格式不正确',
    hint: '填写完整的 /decide 端点，例如 http://127.0.0.1:8787/decide。',
  },
  unreachable: {
    title: '无法连接本地智能体',
    hint: '服务未启动、CORS 未对该 Origin 放行，或浏览器阻止了本地网络访问。',
  },
  unauthorized: {
    title: '认证失败（401）',
    hint: '本地服务要求访问令牌；检查令牌是否正确。',
  },
  forbidden: {
    title: '访问被拒绝（403）',
    hint: '本地服务的 Origin 白名单可能没有包含本站地址。',
  },
  'not-found': {
    title: '端点不存在（404）',
    hint: '检查路径是否为 /decide，以及服务是否真的实现了该协议。',
  },
  'rate-limited': {
    title: '请求过于频繁（429）',
    hint: '本地服务限制了调用频率；稍后重试。',
  },
  'server-error': {
    title: '本地服务内部错误（5xx）',
    hint: '查看本地服务日志。',
  },
  timeout: {
    title: '请求超时',
    hint: '本地服务没有在超时时间内返回；检查模型加载或推理耗时。',
  },
  'bad-response': {
    title: '响应格式不符',
    hint: '响应必须是 {"action": ...}，且 action 属于合法动作集合。',
  },
  aborted: {
    title: '已取消',
    hint: '请求被主动取消。',
  },
}