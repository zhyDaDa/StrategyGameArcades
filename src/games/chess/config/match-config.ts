import { z } from 'zod'
import { refineSeatConfig, seatNameSchema, seatTypeSchema } from '@/presentation/match-setup/schema'
import type { SeatMatchConfig } from '@/presentation/match-setup/types'
import { CHESS_SIDES } from '../domain/types'

/** 一局国际象棋的配置；席位可任意组合接入方式，与局面快照一起持久化。 */
export type ChessMatchConfig = SeatMatchConfig<(typeof CHESS_SIDES)[number]>

export const DEFAULT_CHESS_MATCH_CONFIG: ChessMatchConfig = {
  seats: [
    { id: 'white', type: 'human' },
    { id: 'black', type: 'algorithm' },
  ],
  youSeat: 'white',
}

const sideSchema = z.enum(CHESS_SIDES)

export const chessMatchConfigSchema = z
  .object({
    seats: z.array(z.object({ id: sideSchema, type: seatTypeSchema, name: seatNameSchema })).length(2),
    youSeat: sideSchema.nullable(),
  })
  .superRefine((config, ctx) => {
    if (config.seats[0]?.id !== 'white' || config.seats[1]?.id !== 'black') {
      ctx.addIssue({
        code: 'custom',
        path: ['seats'],
        message: '席位必须按白、黑顺序排列',
      })
    }
    refineSeatConfig(config, ctx)
  })

export const CHESS_RULES_SUMMARY =
  '8×8 棋盘，白先黑后。王、后、车、象、马、兵按经典走法移动；支持王车易位、吃过路兵与兵到底线升变。被将军时必须应将，将死对方即胜；无子可动为逼和。连续 50 回合未吃子或走兵、或双方子力不足以将死时判和。'