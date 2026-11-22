import { z } from 'zod'
import type { SeatMatchConfig } from './types'

export const seatTypeSchema = z.enum(['human', 'ai'])

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
 * - 没有真人（AI 对 AI）时必须为 null；
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