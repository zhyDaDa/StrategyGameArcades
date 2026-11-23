import { abortError } from '../http/signal'
import {
  SCRIPT_PROTOCOL_VERSION,
  type ScriptRunInput,
  type ScriptRunResult,
  type ScriptRunner,
  type ScriptWorkerRequest,
  type ScriptWorkerResponse,
} from './protocol'

const WORKER_GRACE_MS = 10_000

/** 测试注入用的最小 Worker 接口；真实浏览器 Worker 天然满足。 */
export interface ScriptWorkerLike {
  postMessage(message: ScriptWorkerRequest): void
  addEventListener(type: 'message', listener: (event: MessageEvent<ScriptWorkerResponse>) => void): void
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void
  removeEventListener(type: 'message', listener: (event: MessageEvent<ScriptWorkerResponse>) => void): void
  removeEventListener(type: 'error', listener: (event: ErrorEvent) => void): void
  terminate(): void
}

function createDefaultWorker(): ScriptWorkerLike {
  return new Worker(new URL('./script.worker.ts', import.meta.url), { type: 'module' })
}

export class WorkerScriptRunner implements ScriptRunner {
  private counter = 0
  private readonly createWorker: () => ScriptWorkerLike

  constructor(createWorker: () => ScriptWorkerLike = createDefaultWorker) {
    this.createWorker = createWorker
  }

  run(input: ScriptRunInput, signal: AbortSignal): Promise<ScriptRunResult> {
    if (signal.aborted) {
      return Promise.reject(abortError())
    }

    const id = `script-${Date.now().toString(36)}-${this.counter++}`
    let worker: ScriptWorkerLike
    try {
      worker = this.createWorker()
    } catch (error) {
      return Promise.reject(error)
    }

    return new Promise<ScriptRunResult>((resolve, reject) => {
      let settled = false

      const finish = (result: ScriptRunResult) => {
        if (settled) {
          return
        }
        settled = true
        cleanup()
        resolve(result)
      }

      const fail = (error: Error) => {
        if (settled) {
          return
        }
        settled = true
        cleanup()
        reject(error)
      }

      const onAbort = () => {
        fail(abortError())
      }

      const hardTimer = setTimeout(() => {
        finish({
          ok: false,
          code: 'timeout',
          message: '策略执行超过硬超时，Worker 已被终止。',
          stack: null,
          logs: [],
          durationMs: input.timeoutMs + WORKER_GRACE_MS,
        })
      }, input.timeoutMs + WORKER_GRACE_MS)

      const cleanup = () => {
        clearTimeout(hardTimer)
        signal.removeEventListener('abort', onAbort)
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
        worker.terminate()
      }

      const onMessage = (event: MessageEvent<ScriptWorkerResponse>) => {
        const response = event.data
        if (response.protocolVersion !== SCRIPT_PROTOCOL_VERSION || response.id !== id) {
          return
        }
        finish(response.result)
      }

      const onError = (event: ErrorEvent) => {
        finish({
          ok: false,
          code: 'sandbox-crash',
          message: `策略 Worker 异常：${event.message || '未知错误'}`,
          stack: null,
          logs: [],
          durationMs: 0,
        })
      }

      signal.addEventListener('abort', onAbort, { once: true })
      worker.addEventListener('message', onMessage)
      worker.addEventListener('error', onError)

      const request: ScriptWorkerRequest = {
        protocolVersion: SCRIPT_PROTOCOL_VERSION,
        id,
        input,
      }
      worker.postMessage(request)
    })
  }
}

export const scriptRunner: ScriptRunner = new WorkerScriptRunner()