import { DecideController } from '@/controllers/DecideController'
import { HumanController } from '@/controllers/HumanController'
import { LLMController } from '@/controllers/LLMController'
import { ScriptController } from '@/controllers/ScriptController'
import type { PlayerController, PlayerId } from '@/core/contracts/player'
import { HttpDecideClient } from '@/integrations/decide/client'
import { createLlmClient } from '@/integrations/llm/client'
import { scriptRunner } from '@/integrations/script/runner'
import { credentialStore } from '@/presentation/ai/credential-store'
import {
  AI_KINDS_BY_SEAT_TYPE,
  aiSeatConfigSchema,
  type AiSeatConfig,
  type CloudLlmConfig,
  type HttpDecideConfig,
  type JavaScriptStrategyConfig,
  type LocalLlmConfig,
} from '@/presentation/match-setup/ai-config'
import type { MatchPlayer } from '@/presentation/hooks/useGameMatch'
import type { SeatAssignment, SeatMatchConfig } from '@/presentation/match-setup/types'

/** 每个游戏提供给接入层的最小上下文；它必须能用游戏自己的 schema 校验动作。 */
export interface SeatPlayerAdapter<O, A> {
  readonly gameId: string
  readonly gameName: string
  readonly rulesSummary: string
  readonly parseAction: (raw: unknown) => A
  readonly createAlgorithm: (id: PlayerId) => PlayerController<O, A>
}

export interface SeatPlayers<S extends string, O, A> {
  readonly players: ReadonlyMap<PlayerId, MatchPlayer<O, A>>
  readonly humans: ReadonlyMap<S, HumanController<O, A>>
}

/**
 * 把席位配置翻译成统一的 PlayerController。
 * 任何配置缺失、凭据丢失、未知类型都显式报错——不静默降级成内置算法。
 */
export function buildSeatPlayers<S extends string, O, A>(
  config: SeatMatchConfig<S>,
  adapter: SeatPlayerAdapter<O, A>,
): SeatPlayers<S, O, A> {
  const players = new Map<PlayerId, MatchPlayer<O, A>>()
  const humans = new Map<S, HumanController<O, A>>()

  for (const seat of config.seats) {
    const controller = createController(seat, adapter, humans)
    players.set(seat.id, {
      controller,
      role: seat.type === 'human' ? 'human' : 'bot',
      undoPolicy: seat.type === 'human' ? 'ask' : 'accept',
    })
  }

  return { players, humans }
}

function createController<S extends string, O, A>(
  seat: SeatAssignment<S>,
  adapter: SeatPlayerAdapter<O, A>,
  humans: Map<S, HumanController<O, A>>,
): PlayerController<O, A> {
  if (seat.type === 'human') {
    const human = new HumanController<O, A>(seat.id)
    humans.set(seat.id, human)
    return human
  }

  try {
    const ai = resolveAiConfig(seat)
    switch (ai.kind) {
      case 'builtin':
        return adapter.createAlgorithm(seat.id)
      case 'javascript':
        return createScriptController(seat.id, ai, adapter)
      case 'cloud-llm':
        return createCloudLlmController(seat.id, ai, adapter)
      case 'local-llm':
        return createLocalLlmController(seat.id, ai, adapter)
      case 'http-decide':
        return createDecideController(seat.id, ai, adapter)
    }
  } catch (error) {
    // 配置缺失 / 凭据丢失：保留一个显式失败的控制器，让错误在轮到该席位时
    // 通过 MessageBar 显示，而不是静默换成内置算法或随机动作。
    return new UnavailableController(seat.id, describeError(error))
  }
}

class UnavailableController<O, A> implements PlayerController<O, A> {
  readonly id: PlayerId

  private readonly reason: string

  constructor(id: PlayerId, reason: string) {
    this.id = id
    this.reason = reason
  }

  decide(): Promise<A> {
    return Promise.reject(new Error(this.reason))
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function resolveAiConfig(seat: SeatAssignment<string>): AiSeatConfig {
  if (seat.ai === undefined) {
    if (seat.type === 'algorithm') {
      return { kind: 'builtin' }
    }
    throw new Error(`席位「${seat.id}」尚未配置 AI 接入方式，无法开局。`)
  }
  const parsed = aiSeatConfigSchema.safeParse(seat.ai)
  if (!parsed.success) {
    throw new Error(
      `席位「${seat.id}」的 AI 配置无效：${parsed.error.issues.map((issue) => issue.message).join('；')}`,
    )
  }
  if (!AI_KINDS_BY_SEAT_TYPE[seat.type].includes(parsed.data.kind)) {
    throw new Error(`席位「${seat.id}」的接入方式与该 AI 配置不匹配。`)
  }
  return parsed.data
}

function createScriptController<O, A>(
  id: PlayerId,
  config: JavaScriptStrategyConfig,
  adapter: SeatPlayerAdapter<O, A>,
): PlayerController<O, A> {
  return new ScriptController<O, A>({
    id,
    gameId: adapter.gameId,
    runner: scriptRunner,
    source: config.source,
    timeoutMs: config.timeoutMs,
    parseAction: adapter.parseAction,
  })
}

function createCloudLlmController<O, A>(
  id: PlayerId,
  config: CloudLlmConfig,
  adapter: SeatPlayerAdapter<O, A>,
): PlayerController<O, A> {
  const apiKey = requireCredential(id, config.credentialId, '云端大模型')
  return new LLMController<O, A>({
    id,
    client: createLlmClient({
      provider: config.provider,
      baseUrl: config.baseUrl,
      apiKey,
      model: config.model,
      timeoutMs: config.timeoutMs,
    }),
    gameName: adapter.gameName,
    rulesSummary: adapter.rulesSummary,
    parseAction: adapter.parseAction,
  })
}

function createLocalLlmController<O, A>(
  id: PlayerId,
  config: LocalLlmConfig,
  adapter: SeatPlayerAdapter<O, A>,
): PlayerController<O, A> {
  const token = config.credentialId === null
    ? ''
    : requireCredential(id, config.credentialId, '本地模型服务')
  return new LLMController<O, A>({
    id,
    client: createLlmClient({
      provider: 'openai-compatible',
      baseUrl: config.baseUrl,
      apiKey: token,
      model: config.model,
      timeoutMs: config.timeoutMs,
    }),
    gameName: adapter.gameName,
    rulesSummary: adapter.rulesSummary,
    parseAction: adapter.parseAction,
  })
}

function createDecideController<O, A>(
  id: PlayerId,
  config: HttpDecideConfig,
  adapter: SeatPlayerAdapter<O, A>,
): PlayerController<O, A> {
  const token = config.credentialId === null
    ? ''
    : requireCredential(id, config.credentialId, '本地智能体')
  return new DecideController<O, A>({
    id,
    gameId: adapter.gameId,
    client: new HttpDecideClient({
      endpoint: config.endpoint,
      token,
      timeoutMs: config.timeoutMs,
    }),
    parseAction: adapter.parseAction,
  })
}

function requireCredential(
  seatId: PlayerId,
  credentialId: string | null,
  label: string,
): string {
  if (credentialId === null) {
    return ''
  }
  const secret = credentialStore.get(credentialId)
  if (secret === null) {
    throw new Error(
      `席位「${seatId}」的${label}凭据已不在本机。请回到配置页重新填写 Key 并保存。`,
    )
  }
  return secret
}