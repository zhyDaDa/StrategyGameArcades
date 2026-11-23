import { describe, expect, it } from 'vitest'
import type { CloudLlmConfig, JavaScriptStrategyConfig } from '@/presentation/match-setup/ai-config'
import { gomokuMatchConfigSchema } from '../config/match-config'

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

describe('gomokuMatchConfigSchema AI 席位校验', () => {
  it('接受完整的双 AI 配置', () => {
    const config = {
      seats: [
        { id: 'black', type: 'algorithm', ai: strategy },
        { id: 'white', type: 'llm', ai: cloud },
      ],
      youSeat: null,
    }
    expect(gomokuMatchConfigSchema.safeParse(config).success).toBe(true)
  })

  it('拒绝大模型席位缺少 ai', () => {
    const config = {
      seats: [
        { id: 'black', type: 'human' },
        { id: 'white', type: 'llm' },
      ],
      youSeat: 'black',
    }
    expect(gomokuMatchConfigSchema.safeParse(config).success).toBe(false)
  })

  it('拒绝人类席位携带 AI 配置', () => {
    const config = {
      seats: [
        { id: 'black', type: 'human', ai: strategy },
        { id: 'white', type: 'algorithm' },
      ],
      youSeat: 'black',
    }
    expect(gomokuMatchConfigSchema.safeParse(config).success).toBe(false)
  })

  it('拒绝接入方式与 AI 类型不匹配', () => {
    const config = {
      seats: [
        { id: 'black', type: 'algorithm', ai: cloud },
        { id: 'white', type: 'algorithm' },
      ],
      youSeat: null,
    }
    expect(gomokuMatchConfigSchema.safeParse(config).success).toBe(false)
  })
})