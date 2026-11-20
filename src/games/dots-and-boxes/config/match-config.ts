import { z } from 'zod'
import { DotsAndBoxesGame } from '../domain/DotsAndBoxesGame'
import { DOTS_AND_BOXES_SEATS, type DotsAndBoxesSeat, type DotsBoardSize } from '../domain/types'

export const DOTS_MATCH_PLAYER_COUNTS = [2, 3, 4] as const
export type DotsMatchPlayerCount = (typeof DOTS_MATCH_PLAYER_COUNTS)[number]

export const DotsSeatType = ['human', 'ai'] as const
export type DotsSeatType = (typeof DotsSeatType)[number]

export interface DotsSeatConfig {
  readonly id: DotsAndBoxesSeat
  readonly type: DotsSeatType
}

/** 一局方格大战的配置；席位按红 / 蓝 / 绿 / 黄顺序取前 N 个。 */
export interface DotsAndBoxesMatchConfig {
  readonly boxSize: DotsBoardSize
  readonly seats: readonly DotsSeatConfig[]
  /** 本机操作者所在的席位，必须是 human 席位之一。 */
  readonly youSeat: DotsAndBoxesSeat
  /** 开局先手；由配置页随机决定后随本局持久化。 */
  readonly firstPlayer: DotsAndBoxesSeat
}

export const DEFAULT_DOTS_MATCH_CONFIG: DotsAndBoxesMatchConfig = {
  boxSize: 12,
  seats: [
    { id: 'red', type: 'human' },
    { id: 'blue', type: 'ai' },
  ],
  youSeat: 'red',
  firstPlayer: 'red',
}

export const dotsMatchConfigSchema = z
  .object({
    boxSize: z.union([z.literal(8), z.literal(12), z.literal(15), z.literal(18)]),
    seats: z
      .array(
        z.object({
          id: z.enum(['red', 'blue', 'green', 'yellow']),
          type: z.enum(['human', 'ai']),
        }),
      )
      .min(2)
      .max(DOTS_AND_BOXES_SEATS.length),
    youSeat: z.enum(['red', 'blue', 'green', 'yellow']),
    firstPlayer: z.enum(['red', 'blue', 'green', 'yellow']),
  })
  .superRefine((config, ctx) => {
    const expected = DOTS_AND_BOXES_SEATS.slice(0, config.seats.length)
    if (config.seats.some((seat, index) => seat.id !== expected[index])) {
      ctx.addIssue({
        code: 'custom',
        path: ['seats'],
        message: `席位必须按 ${DOTS_AND_BOXES_SEATS.join(' / ')} 的顺序取前缀`,
      })
    }

    const humanSeats = config.seats.filter((seat) => seat.type === 'human')
    if (!humanSeats.some((seat) => seat.id === config.youSeat)) {
      ctx.addIssue({ code: 'custom', path: ['youSeat'], message: '本机操作者必须坐在 human 席位' })
    }
    if (!config.seats.some((seat) => seat.id === config.firstPlayer)) {
      ctx.addIssue({ code: 'custom', path: ['firstPlayer'], message: '先手不在本局玩家中' })
    }
  })

export function createDotsAndBoxesGame(config: DotsAndBoxesMatchConfig): DotsAndBoxesGame {
  return new DotsAndBoxesGame({
    boxSize: config.boxSize,
    players: config.seats.map((seat) => seat.id),
    firstPlayer: config.firstPlayer,
  })
}

export const DOTS_AND_BOXES_RULES_SUMMARY =
  '棋盘由点阵组成，轮流连接相邻两点。围成一个最小方格即占领该格并得 1 分，得分后可继续连线；所有方格被占满时，分数最高者获胜。'