import { z } from 'zod'
import { NestedTicTacToeGame } from '../domain/NestedTicTacToeGame'
import type { NestedTicTacToeSide } from '../domain/types'

export const NestedSeatType = ['human', 'ai'] as const
export type NestedSeatType = (typeof NestedSeatType)[number]

export interface NestedSeatConfig {
  readonly id: NestedTicTacToeSide
  readonly type: NestedSeatType
}

/** 一局九宫井字棋的配置；红方固定先手，席位顺序固定为红、蓝。 */
export interface NestedTicTacToeMatchConfig {
  readonly seats: readonly NestedSeatConfig[]
  /** 本机操作者所在的席位，必须是 human 席位。 */
  readonly youSeat: NestedTicTacToeSide
}

export const DEFAULT_NESTED_MATCH_CONFIG: NestedTicTacToeMatchConfig = {
  seats: [
    { id: 'red', type: 'human' },
    { id: 'blue', type: 'ai' },
  ],
  youSeat: 'red',
}

export const nestedTicTacToeMatchConfigSchema = z
  .object({
    seats: z
      .array(
        z.object({
          id: z.enum(['red', 'blue']),
          type: z.enum(['human', 'ai']),
        }),
      )
      .length(2),
    youSeat: z.enum(['red', 'blue']),
  })
  .superRefine((config, ctx) => {
    if (config.seats[0]?.id !== 'red' || config.seats[1]?.id !== 'blue') {
      ctx.addIssue({
        code: 'custom',
        path: ['seats'],
        message: '席位必须按红、蓝顺序排列',
      })
    }
    if (!config.seats.some((seat) => seat.type === 'human')) {
      ctx.addIssue({
        code: 'custom',
        path: ['seats'],
        message: '至少需要一位本机玩家',
      })
    }
    const you = config.seats.find((seat) => seat.id === config.youSeat)
    if (you === undefined || you.type !== 'human') {
      ctx.addIssue({
        code: 'custom',
        path: ['youSeat'],
        message: '本机操作者必须坐在 human 席位',
      })
    }
  })

export function createNestedTicTacToeGame(): NestedTicTacToeGame {
  return new NestedTicTacToeGame()
}

export const NESTED_TIC_TAC_TOE_RULES_SUMMARY =
  '9×9 棋盘由九个 3×3 小棋盘组成。小棋盘内三连即占领该宫，该宫随即封盘、不能再落子；在大棋盘上占领三宫连成一线者获胜。落点在宫内的位置决定对手下一步要下的小棋盘；若该宫已占领或封盘，对手可以任意落子。红方（圆）先行。'