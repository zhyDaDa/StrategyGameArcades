import { z } from 'zod'

const STORAGE_KEY = 'table.ai.strategies.v1'

const savedStrategySchema = z.object({
  id: z.string().min(1).max(120),
  gameId: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  source: z.string().min(1).max(64 * 1024),
  timeoutMs: z.number().int().min(100).max(10_000),
  updatedAt: z.number().int().nonnegative(),
})

const librarySchema = z.object({
  version: z.literal(1),
  entries: z.array(savedStrategySchema).max(100),
})

export type SavedStrategy = z.infer<typeof savedStrategySchema>

export interface StrategyDraft {
  readonly gameId: string
  readonly name: string
  readonly source: string
  readonly timeoutMs: number
}

/** 按游戏筛选的本地策略库；只保存源码，不执行其中任何内容。 */
export function readStrategies(gameId: string): readonly SavedStrategy[] {
  const all = readAll()
  return all.filter((entry) => entry.gameId === gameId)
}

export function saveStrategy(draft: StrategyDraft): SavedStrategy {
  const entry: SavedStrategy = {
    id: createId(),
    gameId: draft.gameId,
    name: draft.name.trim() === '' ? '未命名策略' : draft.name.trim().slice(0, 80),
    source: draft.source,
    timeoutMs: draft.timeoutMs,
    updatedAt: Date.now(),
  }
  const next = [entry, ...readAll()].slice(0, 100)
  writeAll(next)
  return entry
}

export function deleteStrategy(id: string): void {
  writeAll(readAll().filter((entry) => entry.id !== id))
}

export function countStrategies(): number {
  return readAll().length
}

export function clearAllStrategies(): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(STORAGE_KEY)
}

function readAll(): readonly SavedStrategy[] {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      return []
    }
    const parsed = librarySchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data.entries : []
  } catch {
    return []
  }
}

function writeAll(entries: readonly SavedStrategy[]): void {
  if (typeof window === 'undefined') {
    return
  }
  const payload = { version: 1 as const, entries }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

function createId(): string {
  const cryptoApi = globalThis.crypto
  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }
  return `strategy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}