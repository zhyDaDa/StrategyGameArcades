import { describe, expect, it } from 'vitest'
import { CredentialStore, type CredentialStorage } from '../credential-store'

class MemoryStorage implements CredentialStorage {
  value: string | null = null
  read = () => this.value
  write = (value: string) => {
    this.value = value
  }
  remove = () => {
    this.value = null
  }
}

describe('CredentialStore', () => {
  it('默认只存在内存', () => {
    const storage = new MemoryStorage()
    const store = new CredentialStore(storage)
    store.set('a', 'secret-a', false)
    expect(store.get('a')).toBe('secret-a')
    expect(storage.read()).toBeNull()
  })

  it('显式记住后写入存储并可恢复', () => {
    const storage = new MemoryStorage()
    const store = new CredentialStore(storage)
    store.set('a', 'secret-a', true)
    expect(storage.read()).toContain('secret-a')

    const restored = new CredentialStore(storage)
    expect(restored.get('a')).toBe('secret-a')
    expect(restored.isRemembered('a')).toBe(true)
  })

  it('改为仅内存时清除持久化', () => {
    const storage = new MemoryStorage()
    const store = new CredentialStore(storage)
    store.set('a', 'secret-a', true)
    store.setRemembered('a', false)
    expect(storage.read()).toBeNull()
    expect(store.get('a')).toBe('secret-a')
  })

  it('删除只移除指定凭据', () => {
    const storage = new MemoryStorage()
    const store = new CredentialStore(storage)
    store.set('a', 'secret-a', true)
    store.set('b', 'secret-b', true)
    store.remove('a')
    expect(store.get('a')).toBeNull()
    expect(store.get('b')).toBe('secret-b')
  })

  it('清空全部凭据同时清空存储', () => {
    const storage = new MemoryStorage()
    const store = new CredentialStore(storage)
    store.set('a', 'secret-a', true)
    store.clearAll()
    expect(store.list()).toEqual([])
    expect(storage.read()).toBeNull()
  })

  it('损坏的持久化数据会被丢弃', () => {
    const storage = new MemoryStorage()
    storage.value = '{"version":1,"entries":[{"id":1}]}'
    const store = new CredentialStore(storage)
    expect(store.list()).toEqual([])
    expect(storage.read()).toBeNull()
  })

  it('变更通知会递增快照版本', () => {
    const store = new CredentialStore(new MemoryStorage())
    const before = store.getSnapshotVersion()
    store.set('a', 'secret-a', false)
    expect(store.getSnapshotVersion()).toBeGreaterThan(before)
  })

  it('拒绝空凭据', () => {
    const store = new CredentialStore(new MemoryStorage())
    expect(() => store.set('a', '   ', false)).toThrow('不能为空')
  })
})