import { z } from 'zod'
import { refineSeatConfig, seatNameSchema, seatTypeSchema } from '@/presentation/match-setup/schema'
import type { SeatMatchConfig } from '@/presentation/match-setup/types'
import { XIANGQI_SIDES } from '../domain/types'

/** 一局中国象棋的配置；席位可任意组合接入方式，与局面快照一起持久化。 */
export type XiangqiMatchConfig = SeatMatchConfig<(typeof XIANGQI_SIDES)[number]>

export const DEFAULT_XIANGQI_MATCH_CONFIG: XiangqiMatchConfig = {
  seats: [
    { id: 'red', type: 'human' },
    { id: 'black', type: 'algorithm' },
  ],
  youSeat: 'red',
}

const sideSchema = z.enum(XIANGQI_SIDES)

export const xiangqiMatchConfigSchema = z
  .object({
    seats: z.array(z.object({ id: sideSchema, type: seatTypeSchema, name: seatNameSchema })).length(2),
    youSeat: sideSchema.nullable(),
  })
  .superRefine((config, ctx) => {
    if (config.seats[0]?.id !== 'red' || config.seats[1]?.id !== 'black') {
      ctx.addIssue({
        code: 'custom',
        path: ['seats'],
        message: '席位必须按红、黑顺序排列',
      })
    }
    refineSeatConfig(config, ctx)
  })

export const XIANGQI_RULES_SUMMARY =
  '9×10 棋盘，红先黑后。车走直线，马走日但受蹩马腿限制，炮需隔一枚棋子吃子，兵卒过河后可横走；相象不过河、仕士不出宫，将帅不得照面。被将军时必须应将，将死或困毙对方即胜；连续 60 回合无吃子判和。'