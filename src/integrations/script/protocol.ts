export const SCRIPT_PROTOCOL_VERSION = 1

/** 单条策略源码上限；过长的源码既难审查，也没有正当用途。 */
export const MAX_SCRIPT_LENGTH = 64 * 1024

export const SCRIPT_ERROR_CODES = [
  'source-too-large',
  'syntax',
  'runtime',
  'timeout',
  'invalid-output',
  'sandbox-crash',
  'aborted',
] as const
export type ScriptErrorCode = (typeof SCRIPT_ERROR_CODES)[number]

export interface ScriptRunInput {
  readonly source: string
  readonly observation: unknown
  readonly legalActions: readonly unknown[]
  readonly context: {
    readonly playerId: string
    readonly turn: number
    readonly gameId: string
  }
  readonly timeoutMs: number
}

export interface ScriptRunSuccess {
  readonly ok: true
  readonly action: unknown
  readonly logs: readonly string[]
  readonly durationMs: number
}

export interface ScriptRunFailure {
  readonly ok: false
  readonly code: ScriptErrorCode
  readonly message: string
  readonly stack: string | null
  readonly logs: readonly string[]
  readonly durationMs: number
}

export type ScriptRunResult = ScriptRunSuccess | ScriptRunFailure

/** 执行器接口：Worker 实现与测试用的假实现共享。 */
export interface ScriptRunner {
  run(input: ScriptRunInput, signal: AbortSignal): Promise<ScriptRunResult>
}

export interface ScriptWorkerRequest {
  readonly protocolVersion: typeof SCRIPT_PROTOCOL_VERSION
  readonly id: string
  readonly input: ScriptRunInput
}

export interface ScriptWorkerResponse {
  readonly protocolVersion: typeof SCRIPT_PROTOCOL_VERSION
  readonly id: string
  readonly result: ScriptRunResult
}

export class ScriptSandboxError extends Error {
  readonly code: ScriptErrorCode
  readonly stackDetail: string | null

  constructor(code: ScriptErrorCode, message: string, stackDetail: string | null = null) {
    super(message)
    this.name = 'ScriptSandboxError'
    this.code = code
    this.stackDetail = stackDetail
  }
}