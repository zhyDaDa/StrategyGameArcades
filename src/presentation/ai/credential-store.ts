const STORAGE_KEY = 'table.ai.credentials.v1'

export interface CredentialStorage {
  read(): string | null
  write(value: string): void
  remove(): void
}

export interface CredentialEntry {
  readonly id: string
  readonly secret: string
  readonly remembered: boolean
}

interface PersistedCredentials {
  readonly version: 1
  readonly entries: readonly { readonly id: string; readonly secret: string }[]
}

/**
 * API Key 的唯一存放处。
 * - 默认只存在内存（页面关闭即消失）。
 * - 用户显式勾选「记住」后才写入 localStorage；localStorage 是明文，
 *   任何同源脚本都能读取，因此 UI 必须把这一点说清楚。
 * - 对局配置只保存 credential id，绝不把 secret 写进对局快照。
 */
export class CredentialStore {
  private readonly storage: CredentialStorage | null
  private entries = new Map<string, CredentialEntry>()
  private listeners = new Set<() => void>()
  private version = 0

  constructor(storage: CredentialStorage | null) {
    this.storage = storage
    this.load()
  }

  getSnapshotVersion(): number {
    return this.version
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  get(id: string | null | undefined): string | null {
    if (id === null || id === undefined) {
      return null
    }
    return this.entries.get(id)?.secret ?? null
  }

  has(id: string | null | undefined): boolean {
    return this.get(id) !== null
  }

  isRemembered(id: string | null | undefined): boolean {
    if (id === null || id === undefined) {
      return false
    }
    return this.entries.get(id)?.remembered ?? false
  }

  set(id: string, secret: string, remember: boolean): void {
    const trimmed = secret.trim()
    if (trimmed === '') {
      throw new Error('API Key 不能为空')
    }
    if (trimmed.length > 4096) {
      throw new Error('API Key 过长')
    }
    this.entries.set(id, { id, secret: trimmed, remembered: remember })
    this.persist()
    this.emit()
  }

  setRemembered(id: string, remember: boolean): void {
    const entry = this.entries.get(id)
    if (entry === undefined) {
      return
    }
    this.entries.set(id, { ...entry, remembered: remember })
    this.persist()
    this.emit()
  }

  remove(id: string): void {
    if (!this.entries.delete(id)) {
      return
    }
    this.persist()
    this.emit()
  }

  clearAll(): void {
    this.entries.clear()
    this.storage?.remove()
    this.emit()
  }

  /** 仅用于测试与诊断：返回元信息，不返回 secret。 */
  list(): readonly Omit<CredentialEntry, 'secret'>[] {
    return [...this.entries.values()].map(({ id, remembered }) => ({ id, remembered }))
  }

  private emit(): void {
    this.version += 1
    for (const listener of this.listeners) {
      listener()
    }
  }

  private load(): void {
    const raw = this.storage?.read() ?? null
    if (raw === null) {
      return
    }
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!isPersistedCredentials(parsed)) {
        this.storage?.remove()
        return
      }
      for (const entry of parsed.entries) {
        this.entries.set(entry.id, { id: entry.id, secret: entry.secret, remembered: true })
      }
    } catch {
      this.storage?.remove()
    }
  }

  private persist(): void {
    if (this.storage === null) {
      return
    }
    const entries = [...this.entries.values()]
      .filter((entry) => entry.remembered)
      .map(({ id, secret }) => ({ id, secret }))
    if (entries.length === 0) {
      this.storage.remove()
      return
    }
    const payload: PersistedCredentials = { version: 1, entries }
    this.storage.write(JSON.stringify(payload))
  }
}

function isPersistedCredentials(value: unknown): value is PersistedCredentials {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  if (record.version !== 1 || !Array.isArray(record.entries)) {
    return false
  }
  return record.entries.every((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) {
      return false
    }
    const item = entry as Record<string, unknown>
    return typeof item.id === 'string' && typeof item.secret === 'string'
  })
}

function createLocalStorageAdapter(): CredentialStorage | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const probe = window.localStorage
    return {
      read: () => probe.getItem(STORAGE_KEY),
      write: (value) => probe.setItem(STORAGE_KEY, value),
      remove: () => probe.removeItem(STORAGE_KEY),
    }
  } catch {
    // 隐私模式或存储被禁用：退化为仅内存，不假装记住了 Key。
    return null
  }
}

export const credentialStore = new CredentialStore(createLocalStorageAdapter())

export function createCredentialId(): string {
  const cryptoApi = globalThis.crypto
  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }
  return `cred-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}