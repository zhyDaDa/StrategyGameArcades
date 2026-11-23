/** 模型连接失败的可辨别原因；UI 不能把所有失败都说成「连接失败」。 */
export const LLM_ERROR_CODES = [
  'invalid-config',
  'invalid-url',
  'cors-or-unreachable',
  'local-network-blocked',
  'unauthorized',
  'forbidden',
  'not-found',
  'rate-limited',
  'server-error',
  'timeout',
  'bad-response',
  'aborted',
  'unknown',
] as const
export type LlmErrorCode = (typeof LLM_ERROR_CODES)[number]

export class LlmRequestError extends Error {
  readonly code: LlmErrorCode
  readonly status: number | null
  readonly detail: string | null

  constructor(
    code: LlmErrorCode,
    message: string,
    options: { readonly status?: number | null; readonly detail?: string | null } = {},
  ) {
    super(message)
    this.name = 'LlmRequestError'
    this.code = code
    this.status = options.status ?? null
    this.detail = options.detail ?? null
  }
}

export function llmHttpError(status: number, body: string): LlmRequestError {
  const detail = body.slice(0, 200)
  if (status === 401) {
    return new LlmRequestError('unauthorized', '认证失败（401）：API Key 无效或没有权限。', { status, detail })
  }
  if (status === 403) {
    return new LlmRequestError('forbidden', '访问被拒绝（403）：Key 权限不足，或服务商禁止浏览器直连。', { status, detail })
  }
  if (status === 404) {
    return new LlmRequestError('not-found', '端点或模型不存在（404）：检查 Base URL 与模型名称。', { status, detail })
  }
  if (status === 429) {
    return new LlmRequestError('rate-limited', '额度或频率受限（429）：稍后重试或检查账户额度。', { status, detail })
  }
  if (status >= 500) {
    return new LlmRequestError('server-error', `模型服务内部错误（${status}）。`, { status, detail })
  }
  return new LlmRequestError('bad-response', `模型服务返回 HTTP ${status}。`, { status, detail })
}

export function llmNetworkError(error: unknown): LlmRequestError {
  if (error instanceof LlmRequestError) {
    return error
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return new LlmRequestError('aborted', '请求已取消。')
  }
  return new LlmRequestError(
    'cors-or-unreachable',
    '无法建立连接：可能是服务不可达、浏览器 CORS 未放行，或本地网络访问被阻止（Private/Local Network Access）。',
    { detail: error instanceof Error ? error.message : String(error) },
  )
}

export function isAbortLike(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

export interface DiagnosticCopy {
  readonly title: string
  readonly hint: string
}

export const LLM_DIAGNOSTIC_COPY: Record<LlmErrorCode, DiagnosticCopy> = {
  'invalid-config': {
    title: '配置不完整',
    hint: '检查接口地址、模型名称与凭据是否填写。',
  },
  'invalid-url': {
    title: '地址格式不正确',
    hint: '使用 https:// 开头的完整基址；本机服务可用 http://127.0.0.1 或 http://localhost。',
  },
  'cors-or-unreachable': {
    title: '无法连接',
    hint: '服务可能未启动，或没有允许本站 Origin 的 CORS 请求。也可能是浏览器阻止了本地网络访问。',
  },
  'local-network-blocked': {
    title: '浏览器阻止了本地网络访问',
    hint: '确认服务只监听 127.0.0.1，并针对本站 Origin 放行 CORS；不要通过关闭浏览器安全策略来绕过。',
  },
  unauthorized: {
    title: '认证失败（401）',
    hint: 'API Key 无效、已过期或没有该模型的权限。',
  },
  forbidden: {
    title: '访问被拒绝（403）',
    hint: 'Key 权限不足，或服务商不允许浏览器直连（需检查其 CORS 与浏览器访问策略）。',
  },
  'not-found': {
    title: '端点或模型不存在（404）',
    hint: '检查 Base URL 是否包含正确的版本前缀，以及模型 ID 是否拼写正确。',
  },
  'rate-limited': {
    title: '额度或频率受限（429）',
    hint: '稍后重试，或检查账户额度与速率限制。',
  },
  'server-error': {
    title: '服务端错误（5xx）',
    hint: '这是服务商一侧的问题；稍后重试或查看其状态页。',
  },
  timeout: {
    title: '请求超时',
    hint: '模型可能在加载或生成长文本；可增大超时时间，或检查本地服务是否卡住。',
  },
  'bad-response': {
    title: '响应格式不符',
    hint: '端点不是兼容的 Chat Completions / Messages 接口，或返回了无法识别的内容。',
  },
  aborted: {
    title: '已取消',
    hint: '请求被主动取消。',
  },
  unknown: {
    title: '未知错误',
    hint: '查看错误详情以定位问题。',
  },
}