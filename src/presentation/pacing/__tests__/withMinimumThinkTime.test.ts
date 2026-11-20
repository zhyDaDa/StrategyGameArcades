import { describe, expect, it } from 'vitest'
import type { DecideContext, PlayerController } from '@/core/contracts/player'
import { withMinimumThinkTime } from '../withMinimumThinkTime'

interface NoopAction {
  readonly type: 'noop'
}

const action: NoopAction = { type: 'noop' }

function context(signal: AbortSignal): DecideContext<Record<string, never>, NoopAction> {
  return {
    playerId: 'bot',
    observation: {},
    legalActions: [action],
    turn: 0,
    signal,
  }
}

const immediateController: PlayerController<Record<string, never>, NoopAction> = {
  id: 'bot',
  async decide() {
    return action
  },
}

describe('withMinimumThinkTime', () => {
  it('决策完成后再补足最短思考时间', async () => {
    const started = performance.now()
    const result = await withMinimumThinkTime(immediateController, 20).decide(
      context(new AbortController().signal),
    )
    expect(result).toBe(action)
    expect(performance.now() - started).toBeGreaterThanOrEqual(15)
  })

  it('abort 立即取消等待', async () => {
    const abort = new AbortController()
    const pending = withMinimumThinkTime(immediateController, 1_000).decide(
      context(abort.signal),
    )
    abort.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })
})