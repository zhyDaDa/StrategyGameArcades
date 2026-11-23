import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkerScriptRunner, type ScriptWorkerLike } from '../runner'
import { SCRIPT_PROTOCOL_VERSION, type ScriptRunResult, type ScriptWorkerRequest, type ScriptWorkerResponse } from '../protocol'

const input = {
  source: 'function decide(o, a) { return a[0] }',
  observation: {},
  legalActions: [{ type: 'place', row: 0, col: 0 }],
  context: { playerId: 'black', turn: 0, gameId: 'test' },
  timeoutMs: 100,
}

class FakeWorker implements ScriptWorkerLike {
  last: ScriptWorkerRequest | null = null
  terminated = 0
  messageListeners = new Set<(event: MessageEvent<ScriptWorkerResponse>) => void>()
  errorListeners = new Set<(event: ErrorEvent) => void>()

  postMessage(message: ScriptWorkerRequest): void {
    this.last = message
  }

  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<ScriptWorkerResponse>) => void,
  ): void
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void
  addEventListener(
    type: 'message' | 'error',
    listener: (event: never) => void,
  ): void {
    if (type === 'message') {
      this.messageListeners.add(
        listener as unknown as (event: MessageEvent<ScriptWorkerResponse>) => void,
      )
    } else {
      this.errorListeners.add(listener as unknown as (event: ErrorEvent) => void)
    }
  }

  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<ScriptWorkerResponse>) => void,
  ): void
  removeEventListener(type: 'error', listener: (event: ErrorEvent) => void): void
  removeEventListener(
    type: 'message' | 'error',
    listener: (event: never) => void,
  ): void {
    if (type === 'message') {
      this.messageListeners.delete(
        listener as unknown as (event: MessageEvent<ScriptWorkerResponse>) => void,
      )
    } else {
      this.errorListeners.delete(listener as unknown as (event: ErrorEvent) => void)
    }
  }

  terminate(): void {
    this.terminated += 1
  }

  emitResult(result: ScriptRunResult): void {
    if (this.last === null) {
      throw new Error('worker 尚未收到请求')
    }
    const response: ScriptWorkerResponse = {
      protocolVersion: SCRIPT_PROTOCOL_VERSION,
      id: this.last.id,
      result,
    }
    for (const listener of this.messageListeners) {
      listener({ data: response } as MessageEvent<ScriptWorkerResponse>)
    }
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('WorkerScriptRunner 生命周期', () => {
  it('收到结果后终止 Worker，且只终止一次', async () => {
    const worker = new FakeWorker()
    const runner = new WorkerScriptRunner(() => worker)
    const promise = runner.run(input, new AbortController().signal)
    worker.emitResult({ ok: true, action: input.legalActions[0], logs: [], durationMs: 1 })
    worker.emitResult({ ok: true, action: input.legalActions[0], logs: [], durationMs: 1 })

    await expect(promise).resolves.toMatchObject({ ok: true })
    expect(worker.terminated).toBe(1)
  })

  it('硬超时后终止 Worker', async () => {
    vi.useFakeTimers()
    const worker = new FakeWorker()
    const runner = new WorkerScriptRunner(() => worker)
    const promise = runner.run(input, new AbortController().signal)
    await vi.advanceTimersByTimeAsync(input.timeoutMs + 10_000)

    await expect(promise).resolves.toMatchObject({ ok: false, code: 'timeout' })
    expect(worker.terminated).toBe(1)
  })

  it('AbortSignal 取消后立即终止 Worker', async () => {
    const worker = new FakeWorker()
    const abort = new AbortController()
    const runner = new WorkerScriptRunner(() => worker)
    const promise = runner.run(input, abort.signal)
    abort.abort()

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    expect(worker.terminated).toBe(1)
  })

  it('每次执行使用独立 Worker 并全部释放', async () => {
    const workers: FakeWorker[] = []
    const runner = new WorkerScriptRunner(() => {
      const worker = new FakeWorker()
      workers.push(worker)
      return worker
    })
    const first = runner.run(input, new AbortController().signal)
    const second = runner.run(input, new AbortController().signal)
    workers[0]?.emitResult({ ok: true, action: input.legalActions[0], logs: [], durationMs: 1 })
    workers[1]?.emitResult({ ok: true, action: input.legalActions[0], logs: [], durationMs: 1 })

    await Promise.all([first, second])
    expect(workers).toHaveLength(2)
    expect(workers.every((worker) => worker.terminated === 1)).toBe(true)
  })

  it('Worker 异常转成显式失败并终止', async () => {
    const worker = new FakeWorker()
    const runner = new WorkerScriptRunner(() => worker)
    const promise = runner.run(input, new AbortController().signal)
    for (const listener of worker.errorListeners) {
      listener({ message: 'crashed' } as ErrorEvent)
    }
    await expect(promise).resolves.toMatchObject({ ok: false, code: 'sandbox-crash' })
    expect(worker.terminated).toBe(1)
  })
})