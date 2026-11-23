import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type * as ProfilesModule from '../profiles'

class FakeStorage {
  map = new Map<string, string>()
  getItem = (key: string) => this.map.get(key) ?? null
  setItem = (key: string, value: string) => {
    this.map.set(key, value)
  }
  removeItem = (key: string) => {
    this.map.delete(key)
  }
}

const storage = new FakeStorage()
let profiles: typeof ProfilesModule

beforeAll(async () => {
  vi.stubGlobal('window', {
    localStorage: storage,
    addEventListener: vi.fn(),
  })
  vi.resetModules()
  profiles = await import('../profiles')
})

afterAll(() => {
  vi.unstubAllGlobals()
})

describe('AI profiles', () => {
  it('保存、读取、更新、删除模型配置', () => {
    profiles.clearProfiles()
    const created = profiles.saveProfile({
      kind: 'cloud-llm',
      name: '我的 GPT',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      provider: 'openai-compatible',
      model: 'gpt-4.1-mini',
      timeoutMs: 30_000,
      credentialId: null,
    })
    expect(profiles.readProfiles()).toHaveLength(1)
    expect(profiles.readProfiles('cloud-llm')[0]?.name).toBe('我的 GPT')

    expect(created.kind).toBe('cloud-llm')
    if (created.kind !== 'cloud-llm') {
      throw new Error('unreachable')
    }
    const updated = profiles.saveProfile({
      id: created.id,
      kind: 'cloud-llm',
      name: '改名后',
      endpoint: created.endpoint,
      provider: created.provider,
      model: created.model,
      timeoutMs: created.timeoutMs,
      credentialId: created.credentialId,
    })
    expect(updated.id).toBe(created.id)
    expect(profiles.readProfiles()).toHaveLength(1)
    expect(profiles.readProfiles()[0]?.name).toBe('改名后')

    profiles.deleteProfile(created.id)
    expect(profiles.readProfiles()).toEqual([])
  })

  it('拒绝不合法地址', () => {
    expect(() =>
      profiles.saveProfile({
        kind: 'cloud-llm',
        name: '坏地址',
        endpoint: 'http://api.example.com/v1/chat/completions',
        provider: 'openai-compatible',
        model: 'x',
        timeoutMs: 30_000,
        credentialId: null,
      }),
    ).toThrow('https')
  })

  it('profile 可转换为席位快照，并用于回显匹配', () => {
    profiles.clearProfiles()
    const profile = profiles.saveProfile({
      kind: 'local-llm',
      name: 'Ollama',
      endpoint: 'http://127.0.0.1:11434/v1/chat/completions',
      model: 'qwen2.5:7b',
      timeoutMs: 60_000,
      credentialId: null,
    })
    const config = profiles.profileToSeatConfig(profile)
    expect(config).toMatchObject({
      kind: 'local-llm',
      endpoint: profile.endpoint,
      model: 'qwen2.5:7b',
    })
    expect(profiles.matchingProfileId(config, profiles.readProfiles())).toBe(profile.id)
    expect(config.kind).toBe('local-llm')
    if (config.kind === 'local-llm') {
      expect(
        profiles.matchingProfileId({ ...config, model: 'other' }, profiles.readProfiles()),
      ).toBeNull()
    }
  })

  it('http-decide profile 不需要模型名', () => {
    const profile = profiles.saveProfile({
      kind: 'http-decide',
      name: '本地智能体',
      endpoint: 'http://127.0.0.1:8787/decide',
      model: '',
      timeoutMs: 30_000,
      credentialId: null,
    })
    expect(profiles.profileToSeatConfig(profile)).toEqual({
      kind: 'http-decide',
      endpoint: 'http://127.0.0.1:8787/decide',
      timeoutMs: 30_000,
      credentialId: null,
    })
  })
})