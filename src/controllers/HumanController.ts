import type { DecideContext, PlayerController, PlayerId } from '@/core/contracts/player'
import { createAbortError } from './abort'

/**
 * 人类玩家适配器。`decide` 在收到 `submit` 前保持 pending，
 * 使人类的交互也能走统一的 Controller 协议。
 */
export class HumanController<O, A> implements PlayerController<O, A> {
  readonly id: PlayerId

  private waiter: { resolve: (action: A) => void; removeAbort: () => void } | null = null

  constructor(id: PlayerId) {
    this.id = id
  }

  submit(action: A): void {
    const waiter = this.waiter
    if (waiter === null) {
      return
    }
    this.waiter = null
    waiter.removeAbort()
    waiter.resolve(action)
  }

  decide(ctx: DecideContext<O, A>): Promise<A> {
    return new Promise<A>((resolve, reject) => {
      const onAbort = () => {
        if (this.waiter?.resolve === resolve) {
          this.waiter = null
          ctx.signal.removeEventListener('abort', onAbort)
          reject(createAbortError())
        }
      }
      if (ctx.signal.aborted) {
        onAbort()
        return
      }
      ctx.signal.addEventListener('abort', onAbort, { once: true })
      this.waiter = {
        resolve,
        removeAbort: () => ctx.signal.removeEventListener('abort', onAbort),
      }
    })
  }
}