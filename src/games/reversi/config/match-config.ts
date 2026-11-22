import { z } from 'zod'
import type { ReversiSide } from '../domain/types'

export const REVERSI_MATCH_MODES = ['human-vs-ai', 'local'] as const
export type ReversiMatchMode = (typeof REVERSI_MATCH_MODES)[number]

/** 一局黑白棋的配置；与局面快照一起持久化。 */
export type ReversiMatchConfig =
  | { readonly mode: 'human-vs-ai'; readonly humanSide: ReversiSide }
  | { readonly mode: 'local' }

export const DEFAULT_REVERSI_MATCH_CONFIG: ReversiMatchConfig = {
  mode: 'human-vs-ai',
  humanSide: 'black',
}

export const reversiMatchConfigSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('human-vs-ai'),
    humanSide: z.enum(['black', 'white']),
  }),
  z.object({
    mode: z.literal('local'),
  }),
])

export const REVERSI_RULES_SUMMARY =
  '8×8 棋盘，黑先白后；落子必须夹住至少一枚对方棋子并全部翻转。当一方无子可下时自动跳过；双方都无子可下时，棋子多者胜。'