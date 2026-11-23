import { z } from 'zod'
import { refineSeatConfig, seatNameSchema, seatTypeSchema } from '@/presentation/match-setup/schema'
import type { SeatMatchConfig } from '@/presentation/match-setup/types'
import { ReversiSide } from '../domain/types'

/** 一局黑白棋的配置；席位可任意组合接入方式，与局面快照一起持久化。 */
export type ReversiMatchConfig = SeatMatchConfig<ReversiSide>

export const DEFAULT_REVERSI_MATCH_CONFIG: ReversiMatchConfig = {
  seats: [
    { id: 'black', type: 'human' },
    { id: 'white', type: 'algorithm' },
  ],
  youSeat: 'black',
}

const sideSchema = z.enum(ReversiSide)

export const reversiMatchConfigSchema = z
  .object({
    seats: z.array(z.object({ id: sideSchema, type: seatTypeSchema, name: seatNameSchema })).length(2),
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

export const REVERSI_RULES_SUMMARY =
  '8×8 棋盘，黑先白后；落子必须夹住至少一枚对方棋子并全部翻转。当一方无子可下时自动跳过；双方都无子可下时，棋子多者胜。'