import { describe, expect, it } from 'vitest'
import {
  aiConfigFingerprint,
  aiSeatConfigSchema,
  type CloudLlmConfig,
  type JavaScriptStrategyConfig,
} from '../ai-config'
import { checkEndpoint } from '@/shared/utils/endpoint'
import { collectSeatIssues, type SeatVerificationMap } from '@/presentation/ai/seat-verification'

const strategy: JavaScriptStrategyConfig = {
  kind: 'javascript',
  language: 'javascript',
  name: '策略',
  source: 'function decide(o, a) { return a[0] }',
  timeoutMs: 2000,
}

const cloud: CloudLlmConfig = {
  kind: 'cloud-llm',
  provider: 'openai-compatible',
  endpoint: 'https://api.example.com/v1/chat/completions',
  model: 'test-model',
  timeoutMs: 30000,
  credentialId: null,
}

describe('checkEndpoint', () => {
  it('允许 https 公网基址', () => {
    expect(checkEndpoint('https://api.example.com/v1', { allowPath: false }).ok).toBe(true)
  })

  it('拒绝公网 http', () => {
    const check = checkEndpoint('http://api.example.com/v1', { allowPath: false })
    expect(check.ok).toBe(false)
    expect(check.message).toContain('https')
  })

  it('允许 localhost http', () => {
    expect(checkEndpoint('http://127.0.0.1:11434/v1', { allowPath: false }).ok).toBe(true)
  })

  it('基址模式拒绝具体路径', () => {
    expect(checkEndpoint('https://api.example.com/v1/chat/completions', { allowPath: false }).ok).toBe(false)
  })

  it('完整端点模式允许路径', () => {
    expect(checkEndpoint('http://127.0.0.1:8787/decide', { allowPath: true }).ok).toBe(true)
  })

  it('拒绝内嵌凭据与查询参数', () => {
    expect(checkEndpoint('https://user:pass@api.example.com/v1', { allowPath: false }).ok).toBe(false)
    expect(checkEndpoint('https://api.example.com/v1?key=x', { allowPath: false }).ok).toBe(false)
  })
})

describe('aiSeatConfigSchema', () => {
  it('接受 JavaScript 策略', () => {
    expect(aiSeatConfigSchema.safeParse(strategy).success).toBe(true)
  })

  it('拒绝缺少模型的云端配置', () => {
    expect(aiSeatConfigSchema.safeParse({ ...cloud, model: '' }).success).toBe(false)
  })

  it('拒绝未知配置来源', () => {
    expect(aiSeatConfigSchema.safeParse({ kind: 'wasm' }).success).toBe(false)
  })

  it('指纹随源码变化', () => {
    const a = aiConfigFingerprint(strategy)
    const b = aiConfigFingerprint({ ...strategy, source: 'function decide() {}' })
    expect(a).not.toBe(b)
  })
})

describe('collectSeatIssues', () => {
  const seats = [
    { id: 'black', type: 'human' as const },
    { id: 'white', type: 'algorithm' as const, ai: strategy },
  ]

  it('未测试的策略席位阻止开局', () => {
    expect(collectSeatIssues(seats, {})).toHaveLength(1)
  })

  it('测试指纹匹配后允许开局', () => {
    const verified: SeatVerificationMap = {
      white: {
        fingerprint: aiConfigFingerprint(strategy),
        summary: 'ok',
        at: 1,
      },
    }
    expect(collectSeatIssues(seats, verified)).toEqual([])
  })

  it('配置修改后测试失效', () => {
    const verified: SeatVerificationMap = {
      white: {
        fingerprint: aiConfigFingerprint({ ...strategy, source: 'function decide(o,a){return a[1]}' }),
        summary: 'ok',
        at: 1,
      },
    }
    expect(collectSeatIssues(seats, verified)[0]?.message).toContain('重新测试')
  })

  it('大模型席位缺少配置时阻止开局', () => {
    expect(
      collectSeatIssues([{ id: 'black', type: 'llm' as const }], {}),
    ).toHaveLength(1)
  })
})

