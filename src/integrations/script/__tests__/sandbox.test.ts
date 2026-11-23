import { describe, expect, it } from 'vitest'
import { runScriptSandbox } from '../sandbox'
import type { ScriptRunInput } from '../protocol'

const base: Omit<ScriptRunInput, 'source'> = {
  observation: { size: 3, cells: ['empty', 'empty', 'empty'] },
  legalActions: [
    { type: 'place', row: 0, col: 0 },
    { type: 'place', row: 0, col: 1 },
  ],
  context: { playerId: 'black', turn: 0, gameId: 'test' },
  timeoutMs: 500,
}

describe('runScriptSandbox', () => {
  it('执行合法策略并返回动作与日志', async () => {
    const result = await runScriptSandbox({
      ...base,
      source: `
        function decide(observation, legalActions, context) {
          console.log('turn', context.turn)
          return legalActions[1]
        }
      `,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.action).toEqual({ type: 'place', row: 0, col: 1 })
      expect(result.logs).toContain('[log] turn 0')
    }
  })

  it('语法错误返回 syntax', async () => {
    const result = await runScriptSandbox({ ...base, source: 'function decide( {' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('syntax')
    }
  })

  it('运行时异常返回 runtime', async () => {
    const result = await runScriptSandbox({
      ...base,
      source: 'function decide() { throw new Error("boom") }',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('runtime')
      expect(result.message).toContain('boom')
    }
  })

  it('缺少 decide 时显式失败', async () => {
    const result = await runScriptSandbox({ ...base, source: 'const x = 1' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('runtime')
      expect(result.message).toContain('decide')
    }
  })

  it('死循环被超时中断', async () => {
    const result = await runScriptSandbox({
      ...base,
      timeoutMs: 100,
      source: 'function decide() { while (true) {} }',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('timeout')
    }
  }, 10_000)

  it('拒绝 Promise 返回', async () => {
    const result = await runScriptSandbox({
      ...base,
      source: 'function decide() { return Promise.resolve({ type: "place", row: 0, col: 0 }) }',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('runtime')
      expect(result.message).toContain('同步')
    }
  })

  it('源码超长直接拒绝', async () => {
    const result = await runScriptSandbox({ ...base, source: 'x'.repeat(70 * 1024) })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('source-too-large')
    }
  })

  it('沙箱内没有 DOM / fetch', async () => {
    const result = await runScriptSandbox({
      ...base,
      source: `
        function decide() {
          if (typeof document !== 'undefined') throw new Error('document 可见')
          if (typeof fetch !== 'undefined') throw new Error('fetch 可见')
          return { type: 'place', row: 0, col: 0 }
        }
      `,
    })
    expect(result.ok).toBe(true)
  })
})