/** 本地回环地址：只有这些主机允许使用 http；其余端点必须 https。 */
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

export interface EndpointCheck {
  readonly ok: boolean
  readonly message: string | null
}

/**
 * 端点校验：拒绝内嵌用户名/密码、非 http(s) 协议与查询参数；
 * 公网端点强制 https，避免 API Key 以明文发送。私有网络地址不做猜测。
 */
export function checkEndpoint(value: string, options: { readonly allowPath: boolean }): EndpointCheck {
  const trimmed = value.trim()
  if (trimmed === '') {
    return { ok: false, message: '请填写端点地址。' }
  }
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, message: '端点不是合法的 URL。' }
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, message: '端点必须使用 http 或 https。' }
  }
  if (url.username !== '' || url.password !== '') {
    return { ok: false, message: '端点中不能包含用户名或密码。' }
  }
  const local = LOCAL_HOSTNAMES.has(url.hostname)
  if (url.protocol === 'http:' && !local) {
    return {
      ok: false,
      message: '非本机端点必须使用 https；http 只允许 localhost / 127.0.0.1。',
    }
  }
  if (!options.allowPath && /\/(chat\/completions|messages)\/?$/.test(url.pathname)) {
    return {
      ok: false,
      message: '这里要求填写不含具体接口路径的服务地址。',
    }
  }
  if (url.search !== '' || url.hash !== '') {
    return { ok: false, message: '端点不能包含查询参数或片段。' }
  }
  return { ok: true, message: null }
}

export function isLocalEndpoint(value: string): boolean {
  try {
    return LOCAL_HOSTNAMES.has(new URL(value).hostname)
  } catch {
    return false
  }
}