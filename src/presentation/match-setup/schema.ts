import { z } from 'zod'
import {
  AI_KINDS_BY_SEAT_TYPE,
  aiSeatConfigSchema,
  type AiSeatConfig,
} from './ai-config'
import { SEAT_TYPES, type SeatMatchConfig, type SeatType } from './types'

export const seatTypeSchema = z.enum(SEAT_TYPES)

/** 玩家名称：可留空；限制长度避免把超长文本写进对局配置。 */
export const seatNameSchema = z.string().max(24).optional()

/** AI 配置随对局持久化，但其中只有凭据 id，没有明文密钥。 */
export const seatAiSchema = aiSeatConfigSchema.optional()

/** 只依赖 addIssue 的结构化上下文，避免把共享校验绑死在某个 Zod 版本的泛型上。 */
interface RefinementContext {
  addIssue(issue: {
    readonly code: 'custom'
    readonly path: (string | number)[]
    readonly message: string
  }): void
}

/**
 * 校验席位配置的核心不变量：
 * - 有真人时必须指定其中一位为本机操作者；
 * - 没有真人（自动对弈）时必须为 null；
 * - 「你的席位」必须真实存在且是真人。
 */
export function refineSeatConfig<S extends string>(
  config: SeatMatchConfig<S>,
  ctx: RefinementContext,
): void {
  const hasHuman = config.seats.some((seat) => seat.type === 'human')

  if (config.youSeat === null) {
    if (hasHuman) {
      ctx.addIssue({
        code: 'custom',
        path: ['youSeat'],
        message: '存在真人席位时必须指定你的席位',
      })
    }
    return
  }

  const you = config.seats.find((seat) => seat.id === config.youSeat)
  if (you === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['youSeat'],
      message: '你的席位不在本局席位中',
    })
    return
  }
  if (you.type !== 'human') {
    ctx.addIssue({
      code: 'custom',
      path: ['youSeat'],
      message: '你的席位必须是真人',
    })
  }
}

/**
 * 校验席位接入方式与 AI 子类型的一致性：
 * - 人类不能携带 ai；
 * - 算法默认内置，若显式配置只能是内置或代码策略；
 * - 大模型 / 小模型必须完整配置，否则不允许开局。
 */
export function refineSeatAi(
  seat: { readonly type: SeatType; readonly ai?: AiSeatConfig },
  ctx: RefinementContext,
  path: (string | number)[] = [],
): void {
  const allowed = AI_KINDS_BY_SEAT_TYPE[seat.type]
  if (seat.ai === undefined) {
    if (seat.type === 'llm' || seat.type === 'local') {
      ctx.addIssue({
        code: 'custom',
        path,
        message: '该席位尚未配置 AI 接入方式',
      })
    }
    return
  }
  if (allowed.length === 0) {
    ctx.addIssue({
      code: 'custom',
      path,
      message: '人类席位不能携带 AI 配置',
    })
    return
  }
  if (!allowed.includes(seat.ai.kind)) {
    ctx.addIssue({
      code: 'custom',
      path,
      message: `该接入方式不支持 ${seat.ai.kind} 配置`,
    })
  }
}