import { LLMController } from '@/controllers/LLMController'
import { isSameAction } from '@/core/contracts/action'
import { testDecideEndpoint } from '@/integrations/decide/diagnostics'
import { explainLlmError } from '@/integrations/llm/diagnostics'
import { createLlmClient } from '@/integrations/llm/client'
import { LlmRequestError } from '@/integrations/llm/errors'
import { scriptRunner } from '@/integrations/script/runner'
import type { AiGameTestContext } from '@/presentation/match-setup/ai-test-context'
import type {
  AiSeatConfig,
  CloudLlmConfig,
  HttpDecideConfig,
  JavaScriptStrategyConfig,
  LocalLlmConfig,
} from '@/presentation/match-setup/ai-config'
import { credentialStore } from './credential-store'

export interface SeatTestSuccess {
  readonly ok: true
  readonly latencyMs: number
  readonly summary: string
  readonly logs: readonly string[]
}

export interface SeatTestFailure {
  readonly ok: false
  readonly code: string
  readonly title: string
  readonly hint: string
  readonly detail: string | null
  readonly logs: readonly string[]
}

export type SeatTestResult = SeatTestSuccess | SeatTestFailure

/**
 * 用真实样例局面测试一个 AI 席位：必须真正返回合法动作才算成功。
 * 这里不做任何随机回退；失败信息保留到 UI，方便定位。
 */
export async function testAiSeat(
  config: AiSeatConfig,
  seatId: string,
  context: AiGameTestContext,
  signal: AbortSignal,
): Promise<SeatTestResult> {
  const position = context.createPosition(seatId)
  const startedAt = Date.now()

  try {
    switch (config.kind) {
      case 'builtin':
        return success(Date.now() - startedAt, '内置算法无需测试，可直接开局。', [])
      case 'javascript':
        return await testJavaScript(config, seatId, context, position, signal, startedAt)
      case 'cloud-llm':
        return await testLlm(config, seatId, context, position, signal, startedAt, true)
      case 'local-llm':
        return await testLlm(config, seatId, context, position, signal, startedAt, false)
      case 'http-decide':
        return await testHttpDecide(config, context, position, signal, startedAt)
    }
  } catch (error) {
    return {
      ok: false,
      code: 'unexpected',
      title: '测试过程出错',
      hint: '检查配置与所选运行时；完整错误见下方。',
      detail: describeError(error),
      logs: [],
    }
  }
}

async function testJavaScript(
  config: JavaScriptStrategyConfig,
  seatId: string,
  context: AiGameTestContext,
  position: ReturnType<AiGameTestContext['createPosition']>,
  signal: AbortSignal,
  startedAt: number,
): Promise<SeatTestResult> {
  const result = await scriptRunner.run(
    {
      source: config.source,
      observation: position.observation,
      legalActions: position.legalActions,
      context: { playerId: seatId, turn: position.turn, gameId: context.gameId },
      timeoutMs: config.timeoutMs,
    },
    signal,
  )
  if (!result.ok) {
    return {
      ok: false,
      code: result.code,
      title: titleForScriptError(result.code),
      hint: hintForScriptError(result.code, config.timeoutMs),
      detail: [result.message, result.stack].filter((part) => part !== null).join('\n'),
      logs: result.logs,
    }
  }

  let action: unknown
  try {
    action = context.parseAction(result.action)
  } catch (error) {
    return {
      ok: false,
      code: 'invalid-action',
      title: '返回值不符合游戏动作结构',
      hint: '对照面板顶部的动作示例，返回其中一个合法动作。',
      detail: describeError(error),
      logs: result.logs,
    }
  }
  if (!position.legalActions.some((legal) => isSameAction(legal, action))) {
    return {
      ok: false,
      code: 'illegal-action',
      title: '返回的动作不在合法动作集合中',
      hint: '当前局面只接受 legalActions 中列出的动作。',
      detail: JSON.stringify(result.action).slice(0, 300),
      logs: result.logs,
    }
  }

  return success(
    Date.now() - startedAt,
    `返回合法动作：${JSON.stringify(action).slice(0, 160)}（执行 ${result.durationMs}ms）`,
    result.logs,
  )
}

async function testLlm(
  config: CloudLlmConfig | LocalLlmConfig,
  seatId: string,
  context: AiGameTestContext,
  position: ReturnType<AiGameTestContext['createPosition']>,
  signal: AbortSignal,
  startedAt: number,
  isCloud: boolean,
): Promise<SeatTestResult> {
  const apiKey = resolveKey(config.credentialId)
  if (config.credentialId !== null && apiKey === null) {
    return {
      ok: false,
      code: 'missing-credential',
      title: '凭据不在本机',
      hint: isCloud
        ? '重新填写 API Key 并点击「保存 Key」。若未勾选记住，刷新页面后需要重新输入。'
        : '重新填写本地服务令牌，或确认该服务不需要令牌。',
      detail: null,
      logs: [],
    }
  }

  const client = createLlmClient({
    provider: isCloud ? ('provider' in config ? config.provider : 'openai-compatible') : 'openai-compatible',
    endpoint: config.endpoint,
    apiKey: apiKey ?? '',
    model: config.model,
    timeoutMs: config.timeoutMs,
  })
  const controller = new LLMController<Record<string, unknown>, unknown>({
    id: seatId,
    client,
    gameName: context.gameName,
    rulesSummary: context.rulesSummary,
    parseAction: context.parseAction,
  })

  try {
    const action = await controller.decide({
      playerId: seatId,
      observation: position.observation as Record<string, unknown>,
      legalActions: position.legalActions,
      turn: position.turn,
      signal,
    })
    return success(
      Date.now() - startedAt,
      `模型返回合法动作：${JSON.stringify(action).slice(0, 160)}`,
      [],
    )
  } catch (error) {
    if (error instanceof LlmRequestError) {
      const diagnostic = explainLlmError(error, signal)
      return {
        ok: false,
        code: diagnostic.code,
        title: diagnostic.title,
        hint: diagnostic.hint,
        detail: diagnostic.detail,
        logs: [],
      }
    }
    return {
      ok: false,
      code: 'invalid-output',
      title: '模型未返回合法动作',
      hint: '模型必须只输出一个属于 legalActions 的 JSON 动作；可重试或更换模型。',
      detail: describeError(error),
      logs: [],
    }
  }
}

async function testHttpDecide(
  config: HttpDecideConfig,
  context: AiGameTestContext,
  position: ReturnType<AiGameTestContext['createPosition']>,
  signal: AbortSignal,
  startedAt: number,
): Promise<SeatTestResult> {
  const token = resolveKey(config.credentialId)
  if (config.credentialId !== null && token === null) {
    return {
      ok: false,
      code: 'missing-credential',
      title: '本地服务令牌不在本机',
      hint: '重新填写令牌并保存；未勾选记住时刷新页面后需要重新输入。',
      detail: null,
      logs: [],
    }
  }

  const result = await testDecideEndpoint(
    {
      endpoint: config.endpoint,
      token: token ?? '',
      timeoutMs: config.timeoutMs,
      gameId: context.gameId,
      observation: position.observation,
      legalActions: position.legalActions,
      turn: position.turn,
      playerId: position.playerId,
      parseAction: context.parseAction,
    },
    signal,
  )

  if (!result.ok) {
    return {
      ok: false,
      code: result.code,
      title: result.title,
      hint: result.hint,
      detail: result.detail,
      logs: [],
    }
  }
  return success(
    Date.now() - startedAt,
    `本地智能体返回合法动作：${JSON.stringify(result.action).slice(0, 160)}`,
    [],
  )
}

function resolveKey(credentialId: string | null): string | null {
  return credentialId === null ? '' : credentialStore.get(credentialId)
}

function success(
  latencyMs: number,
  summary: string,
  logs: readonly string[],
): SeatTestSuccess {
  return { ok: true, latencyMs, summary, logs }
}

function titleForScriptError(code: string): string {
  switch (code) {
    case 'timeout':
      return '策略执行超时'
    case 'syntax':
      return '策略存在语法错误'
    case 'source-too-large':
      return '策略源码过长'
    case 'invalid-output':
      return '策略返回值不是 JSON 动作'
    case 'sandbox-crash':
      return '沙箱异常'
    default:
      return '策略运行时错误'
  }
}

function hintForScriptError(code: string, timeoutMs: number): string {
  switch (code) {
    case 'timeout':
      return `单步上限为 ${timeoutMs}ms。避免在 decide() 里写死循环或过重的搜索。`
    case 'syntax':
      return '检查报错行号的语法；保存后可以重新测试。'
    case 'invalid-output':
      return 'decide() 必须返回 legalActions 中的一个对象。'
    default:
      return '查看下方错误与 console 输出。'
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message
  }
  return String(error)
}