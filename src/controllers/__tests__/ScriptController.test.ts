import { describe, expect, it, vi } from 'vitest'
import { ScriptController, ScriptExecutionError } from '../ScriptController'
import type { ScriptRunResult, ScriptRunner } from '@/integrations/script/protocol'

type Action = { readonly type: 'place'; readonly row: number; readonly col: number }

const legal: readonly Action[] = [
  { type: 'place', row: 0, col: 0 },
  { type: 'place', row: 1, col: 1 },
]

const context = {
  playerId: 'black',
  observation: { ok: true },
  legalActions: legal,
  turn: 0,
  signal: new AbortController().signal,
}

function runnerReturning(result: ScriptRunResult): ScriptRunner {
  return {
    run: vi.fn(async () => result),
  }
}

function controller(runner: ScriptRunner) {
  return new ScriptController<unknown, Action>({
    id: 'black',
    gameId: 'test',
    runner,
    source: 'function decide() {}',
    timeoutMs: 500,
    parseAction: (raw) => {
      if (typeof raw !== 'object' || raw === null || !('type' in raw)) {
        throw new Error('不是动作')
      }
      return raw as Action
    },
  })
}

describe('ScriptController', () => {
  it('返回合法动作', async () => {
    const action = await controller(
      runnerReturning({ ok: true, action: legal[1], logs: [], durationMs: 1 }),
    ).decide(context)
    expect(action).toEqual(legal[1])
  })

  it('非法动作显式报错', async () => {
    const failure = controller(
      runnerReturning({ ok: true, action: { type: 'place', row: 9, col: 9 }, logs: [], durationMs: 1 }),
    ).decide(context)
    await expect(failure).rejects.toMatchObject({ code: 'illegal-action' })
  })

  it('不符合结构显式报错', async () => {
    const failure = controller(
      runnerReturning({ ok: true, action: { nope: true }, logs: [], durationMs: 1 }),
    ).decide(context)
    await expect(failure).rejects.toMatchObject({ code: 'invalid-action' })
  })

  it('沙箱失败保留错误码', async () => {
    const failure = controller(
      runnerReturning({ ok: false, code: 'timeout', message: '超时', stack: null, logs: [], durationMs: 1 }),
    ).decide(context)
    await expect(failure).rejects.toBeInstanceOf(ScriptExecutionError)
    await expect(failure).rejects.toMatchObject({ code: 'timeout' })
  })

  it('没有合法动作时直接报错', async () => {
    const failure = controller(runnerReturning({ ok: true, action: legal[0], logs: [], durationMs: 1 })).decide({
      ...context,
      legalActions: [],
    })
    await expect(failure).rejects.toThrow('没有可行动作')
  })

  it('AbortSignal 取消后不提交动作', async () => {
    const abort = new AbortController()
    abort.abort()
    const failure = controller(
      runnerReturning({ ok: true, action: legal[0], logs: [], durationMs: 1 }),
    ).decide({ ...context, signal: abort.signal })
    await expect(failure).rejects.toMatchObject({ name: 'AbortError' })
  })
})