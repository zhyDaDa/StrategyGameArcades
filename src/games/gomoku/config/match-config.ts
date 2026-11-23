import { z } from 'zod'
import { refineSeatConfig, seatNameSchema, seatTypeSchema } from '@/presentation/match-setup/schema'
import type { SeatMatchConfig } from '@/presentation/match-setup/types'
import { GomokuSide } from '../domain/types'

/** 一局五子棋的配置；席位可任意组合接入方式，与局面快照一起持久化。 */
export type GomokuMatchConfig = SeatMatchConfig<GomokuSide>

export const DEFAULT_GOMOKU_MATCH_CONFIG: GomokuMatchConfig = {
  seats: [
    { id: 'black', type: 'human' },
    { id: 'white', type: 'algorithm' },
  ],
  youSeat: 'black',
}

const sideSchema = z.enum(GomokuSide)

export const gomokuMatchConfigSchema = z
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

export const GOMOKU_RULES_SUMMARY =
  '15×15 棋盘，黑先白后，轮流在空位落子；横、竖、斜任一方向先连成五子者胜。'