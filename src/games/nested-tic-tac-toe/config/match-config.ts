import { z } from 'zod'
import { refineSeatAi, refineSeatConfig, seatAiSchema, seatNameSchema, seatTypeSchema } from '@/presentation/match-setup/schema'
import type { SeatMatchConfig } from '@/presentation/match-setup/types'
import { NestedTicTacToeGame } from '../domain/NestedTicTacToeGame'
import { NESTED_SIDES, type NestedTicTacToeSide } from '../domain/types'

/** 一局九宫井字棋的配置；席位可任意组合接入方式，红方固定先手。 */
export type NestedTicTacToeMatchConfig = SeatMatchConfig<NestedTicTacToeSide>

export const DEFAULT_NESTED_MATCH_CONFIG: NestedTicTacToeMatchConfig = {
  seats: [
    { id: 'red', type: 'human' },
    { id: 'blue', type: 'algorithm' },
  ],
  youSeat: 'red',
}

const sideSchema = z.enum(NESTED_SIDES)

export const nestedTicTacToeMatchConfigSchema = z
  .object({
    seats: z.array(z.object({ id: sideSchema, type: seatTypeSchema, name: seatNameSchema, ai: seatAiSchema })).length(2),
    youSeat: sideSchema.nullable(),
  })
  .superRefine((config, ctx) => {
    if (config.seats[0]?.id !== 'red' || config.seats[1]?.id !== 'blue') {
      ctx.addIssue({
        code: 'custom',
        path: ['seats'],
        message: '席位必须按红、蓝顺序排列',
      })
    }
    config.seats.forEach((seat, index) => refineSeatAi(seat, ctx, ['seats', index, 'ai']))
    refineSeatConfig(config, ctx)
  })

export function createNestedTicTacToeGame(): NestedTicTacToeGame {
  return new NestedTicTacToeGame()
}

export const NESTED_TIC_TAC_TOE_RULES_SUMMARY =
  '9×9 棋盘由九个 3×3 小棋盘组成。小棋盘内三连即占领该宫，该宫随即封盘、不能再落子；在大棋盘上占领三宫连成一线者获胜。落点在宫内的位置决定对手下一步要下的小棋盘；若该宫已占领或封盘，对手可以任意落子。红方（圆）先行。'