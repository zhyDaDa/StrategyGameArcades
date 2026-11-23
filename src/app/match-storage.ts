const KEY_PREFIX = 'table.match.'

/** 配置页产出的启动负载：游戏配置 + 序列化后的初始局面。 */
export interface MatchStartPayload {
  readonly config: unknown
  readonly save: string
}

export type StoredMatchResult =
  | { readonly ok: true; readonly match: MatchStartPayload }
  | { readonly ok: false; readonly reason: 'missing' | 'invalid' }

/** 读取按 gameId 分区的对局快照；JSON 或结构损坏时返回 invalid。 */
export function readStoredMatch(gameId: string): StoredMatchResult {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'missing' }
  }
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + gameId)
    if (raw === null) {
      return { ok: false, reason: 'missing' }
    }
    const parsed: unknown = JSON.parse(raw)
    if (!isMatchStartPayload(parsed)) {
      return { ok: false, reason: 'invalid' }
    }
    return { ok: true, match: { config: parsed.config, save: parsed.save } }
  } catch {
    return { ok: false, reason: 'invalid' }
  }
}

export function saveStoredMatch(gameId: string, payload: MatchStartPayload): void {
  window.localStorage.setItem(KEY_PREFIX + gameId, JSON.stringify(payload))
}

export function clearStoredMatch(gameId: string): void {
  window.localStorage.removeItem(KEY_PREFIX + gameId)
}

function isMatchStartPayload(value: unknown): value is MatchStartPayload {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return typeof record.save === 'string' && 'config' in record
}