import type { DecideContext, PlayerController } from '@/core/contracts/player'
import { pacingTokens } from './tokens'

/**
 * 给任意 Controller 套上「最短思考时间」：决策本身可以很快，
 * 但对外表现为至少思考这么久。只应包裹 bot，人类点击不应被延迟。
 */
export function withMinimumThinkTime<O, A>(
  controller: PlayerController<O, A>,
  minimumMs: number = pacingTokens.aiMinimumThinkMs,
): PlayerController<O, A> {
  return {
    id: controller.id,
    async decide(ctx: DecideContext<O, A>): Promise<A> {
      const startedAt = performance.now()
      const action = await controller.decide(ctx)
      const remainingMs = minimumMs - (performance.now() - startedAt)
      if (remainingMs > 0) {
        await waitForPacing(remainingMs, ctx.signal)
      }
      ctx.signal.throwIfAborted()
      return action
    },
  }
}

/** 带取消的计时等待；悔棋、换人、卸载都会通过 abort 立即结束。 */
export function waitForPacing(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError())
      return
    }
    let timer: number | undefined
    const onAbort = () => {
      if (timer !== undefined) {
        clearTimeout(timer)
      }
      signal.removeEventListener('abort', onAbort)
      reject(createAbortError())
    }
    timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function createAbortError(): Error {
  const error = new Error('决策已取消')
  error.name = 'AbortError'
  return error
}