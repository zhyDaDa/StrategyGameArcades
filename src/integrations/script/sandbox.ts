import {
  getQuickJS,
  shouldInterruptAfterDeadline,
  type QuickJSContext,
  type QuickJSHandle,
} from 'quickjs-emscripten'
import {
  MAX_SCRIPT_LENGTH,
  ScriptSandboxError,
  type ScriptErrorCode,
  type ScriptRunInput,
  type ScriptRunResult,
} from './protocol'

const MEMORY_LIMIT_BYTES = 64 * 1024 * 1024
const STACK_LIMIT_BYTES = 1024 * 1024
const MAX_LOGS = 50
const MAX_LOG_LENGTH = 500

const CALL_EXPRESSION = `(function () {
  if (typeof globalThis.decide !== 'function') {
    throw new Error('请定义 decide(observation, legalActions, context) 函数');
  }
  var observation = JSON.parse(globalThis.__aiObservationJson);
  var legalActions = JSON.parse(globalThis.__aiLegalActionsJson);
  var context = JSON.parse(globalThis.__aiContextJson);
  var value = globalThis.decide(observation, legalActions, context);
  if (value && typeof value.then === 'function') {
    throw new Error('decide() 必须同步返回动作，不支持 Promise');
  }
  var json = JSON.stringify(value);
  if (typeof json !== 'string') {
    throw new Error('decide() 必须返回可序列化为 JSON 的动作');
  }
  return json;
})()`

/**
 * 在一个全新 QuickJS 运行时里执行用户策略。
 * QuickJS 本身没有 DOM、fetch、localStorage 或任何宿主对象；这里只额外注入
 * 只读的 JSON 快照与一个受限的 console。执行结束立即销毁运行时。
 *
 * 注意：Worker 是资源隔离与超时手段，不是完整的安全边界；
 * 真正的安全性来自「独立解释器 + 不暴露宿主能力」。
 */
export async function runScriptSandbox(input: ScriptRunInput): Promise<ScriptRunResult> {
  const startedAt = Date.now()
  const logs: string[] = []

  if (input.source.length > MAX_SCRIPT_LENGTH) {
    return failure('source-too-large', `策略源码超过 ${MAX_SCRIPT_LENGTH} 字符上限。`, null, logs, startedAt)
  }
  const timeoutMs = Math.max(50, Math.min(10_000, Math.round(input.timeoutMs)))
  const deadline = Date.now() + timeoutMs

  const QuickJS = await getQuickJS()
  const runtime = QuickJS.newRuntime()
  runtime.setMemoryLimit(MEMORY_LIMIT_BYTES)
  runtime.setMaxStackSize(STACK_LIMIT_BYTES)
  runtime.setInterruptHandler(shouldInterruptAfterDeadline(deadline))

  const context = runtime.newContext()
  try {
    installConsole(context, logs)
    setJsonGlobal(context, '__aiObservationJson', input.observation)
    setJsonGlobal(context, '__aiLegalActionsJson', input.legalActions)
    setJsonGlobal(context, '__aiContextJson', input.context)

    evaluateSource(context, input.source)
    const actionJson = evaluateCall(context)

    let action: unknown
    try {
      action = JSON.parse(actionJson)
    } catch {
      return failure('invalid-output', '策略返回值无法解析为 JSON。', null, logs, startedAt)
    }

    return {
      ok: true,
      action,
      logs,
      durationMs: Date.now() - startedAt,
    }
  } catch (error) {
    if (error instanceof ScriptSandboxError) {
      return failure(error.code, error.message, error.stackDetail, logs, startedAt)
    }
    const message = error instanceof Error ? error.message : String(error)
    const timedOut = Date.now() >= deadline || /interrupt/i.test(message)
    return failure(
      timedOut ? 'timeout' : 'sandbox-crash',
      timedOut ? `策略执行超过 ${timeoutMs}ms，已被中断。` : message,
      error instanceof Error ? (error.stack ?? null) : null,
      logs,
      startedAt,
    )
  } finally {
    // 无论成功、异常还是超时，都销毁整个上下文与运行时。
    context.dispose()
    runtime.dispose()
  }
}

function failure(
  code: ScriptErrorCode,
  message: string,
  stack: string | null,
  logs: readonly string[],
  startedAt: number,
): ScriptRunResult {
  return {
    ok: false,
    code,
    message,
    stack,
    logs,
    durationMs: Date.now() - startedAt,
  }
}

function installConsole(context: QuickJSContext, logs: string[]): void {
  const consoleHandle = context.newObject()
  const write = (level: string) => {
    return (...args: QuickJSHandle[]) => {
      if (logs.length >= MAX_LOGS) {
        return
      }
      const text = args
        .map((arg) => formatHandle(context, arg))
        .join(' ')
        .slice(0, MAX_LOG_LENGTH)
      logs.push(`[${level}] ${text}`)
    }
  }
  for (const level of ['log', 'info', 'warn', 'error'] as const) {
    const fn = context.newFunction(level, write(level))
    context.setProp(consoleHandle, level, fn)
    fn.dispose()
  }
  context.setProp(context.global, 'console', consoleHandle)
  consoleHandle.dispose()
}

function formatHandle(context: QuickJSContext, handle: QuickJSHandle): string {
  try {
    const value = context.dump(handle)
    return typeof value === 'string' ? value : JSON.stringify(value)
  } catch {
    return '[无法显示的值]'
  }
}

function setJsonGlobal(context: QuickJSContext, name: string, value: unknown): void {
  const handle = context.newString(JSON.stringify(value))
  context.setProp(context.global, name, handle)
  handle.dispose()
}

function evaluateSource(context: QuickJSContext, code: string): void {
  const result = context.evalCode(code, 'strategy.js')
  if (result.error) {
    throw toSandboxError(context, result.error, 'syntax')
  }
  result.value.dispose()
}

function evaluateCall(context: QuickJSContext): string {
  const result = context.evalCode(CALL_EXPRESSION, 'strategy-call.js')
  if (result.error) {
    throw toSandboxError(context, result.error, 'runtime')
  }
  const value = result.value
  try {
    if (context.typeof(value) !== 'string') {
      throw new ScriptSandboxError('invalid-output', '策略调用没有返回 JSON 字符串。')
    }
    return context.getString(value)
  } finally {
    value.dispose()
  }
}

function toSandboxError(
  context: QuickJSContext,
  errorHandle: QuickJSHandle,
  fallbackCode: 'syntax' | 'runtime',
): ScriptSandboxError {
  const dumped = context.dump(errorHandle) as {
    readonly name?: string
    readonly message?: string
    readonly stack?: string
  }
  errorHandle.dispose()
  const message = `${dumped.name ?? 'Error'}: ${dumped.message ?? '执行失败'}`
  const timedOut = /interrupt/i.test(message)
  return new ScriptSandboxError(
    timedOut ? 'timeout' : fallbackCode,
    timedOut ? '策略执行被超时中断。' : message,
    dumped.stack ?? null,
  )
}

