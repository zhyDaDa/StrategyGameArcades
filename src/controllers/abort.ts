export function createAbortError(): Error {
  const error = new Error('决策已取消')
  error.name = 'AbortError'
  return error
}

export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw createAbortError()
  }
}