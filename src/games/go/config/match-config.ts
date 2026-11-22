import { z } from 'zod'
import { refineSeatConfig, seatTypeSchema } from '@/presentation/match-setup/schema'
import type { SeatMatchConfig } from '@/presentation/match-setup/types'
import { GoSide } from '../domain/types'

/** 一局围棋的配置；席位可任意组合真人 / AI，与局面快照一起持久化。 */
export type GoMatchConfig = SeatMatchConfig<GoSide>

export const DEFAULT_GO_MATCH_CONFIG: GoMatchConfig = {
  seats: [
    { id: 'black', type: 'human' },
    { id: 'white', type: 'ai' },
  ],
  youSeat: 'black',
}

const sideSchema = z.enum(GoSide)

export const goMatchConfigSchema = z
  .object({
    seats: z.array(z.object({ id: sideSchema, type: seatTypeSchema })).length(2),
    youSeat: sideSchema.nullable(),
  })
  .superRefine((config, ctx) => {
    if (config.seats[0]?.id !== 'black' || config.seats[1]?.id !== 'white') {
      ctx.addIssue({
        code: 'custom',
        path: ['seats'],
        message: '席位必须按黑、白顺序排列',
      })
    }
    refineSeatConfig(config, ctx)
  })

export const GO_RULES_SUMMARY =
  '19×19 棋盘，黑先白后。无气的对方棋子会被整块提掉；禁止自杀，也不能立即回提形成劫争。双方连续停一手即结束，按中国规则数子（棋子 + 围空），白贴 7.5 目，多者胜。'