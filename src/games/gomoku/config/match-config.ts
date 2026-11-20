import { z } from 'zod'
import type { GomokuSide } from '../domain/types'

export const GOMOKU_MATCH_MODES = ['human-vs-ai', 'local'] as const
export type GomokuMatchMode = (typeof GOMOKU_MATCH_MODES)[number]

/** 一局五子棋的配置；它是初始黑板的一部分，与局面快照一起持久化。 */
export type GomokuMatchConfig =
  | { readonly mode: 'human-vs-ai'; readonly humanSide: GomokuSide }
  | { readonly mode: 'local' }

export const DEFAULT_GOMOKU_MATCH_CONFIG: GomokuMatchConfig = {
  mode: 'human-vs-ai',
  humanSide: 'black',
}

export const gomokuMatchConfigSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('human-vs-ai'),
    humanSide: z.enum(['black', 'white']),
  }),
  z.object({
    mode: z.literal('local'),
  }),
])

export const GOMOKU_RULES_SUMMARY =
  '15×15 棋盘，黑先白后，轮流在空位落子；横、竖、斜任一方向先连成五子者胜。'