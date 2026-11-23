export interface TimedAbort {
  readonly signal: AbortSignal
  /** 超时后为 true；调用方主动取消后为 false。 */
  timedOut(): boolean
  dispose(): void
}

/**
 * 把调用方的 AbortSignal 与超时组合成一个信号。
 * 不依赖 AbortSignal.any / AbortSignal.timeout，兼容性更好，也能区分「谁取消的」。
 */
export function withTimeout(signal: AbortSignal, timeoutMs: number): TimedAbort {
  const controller = new AbortController()
  let didTimeout = false
  let disposed = false

  const onAbort = () => {
    if (!disposed) {
      controller.abort()
    }
  }
  if (signal.aborted) {
    controller.abort()
  } else {
    signal.addEventListener('abort', onAbort, { once: true })
  }

  const timer = setTimeout(() => {
    didTimeout = true
    controller.abort()
  }, timeoutMs)

  return {
    signal: controller.signal,
    timedOut: () => didTimeout,
    dispose: () => {
      disposed = true
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
    },
  }
}

export function abortError(message = '请求已取消'): Error {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}