import { z } from 'zod'
import type { GoSide } from '../domain/types'

export const GO_MATCH_MODES = ['human-vs-ai', 'local'] as const
export type GoMatchMode = (typeof GO_MATCH_MODES)[number]

/** 一局围棋的配置；与局面快照一起持久化。 */
export type GoMatchConfig =
  | { readonly mode: 'human-vs-ai'; readonly humanSide: GoSide }
  | { readonly mode: 'local' }

export const DEFAULT_GO_MATCH_CONFIG: GoMatchConfig = {
  mode: 'human-vs-ai',
  humanSide: 'black',
}

export const goMatchConfigSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('human-vs-ai'),
    humanSide: z.enum(['black', 'white']),
  }),
  z.object({
    mode: z.literal('local'),
  }),
])

export const GO_RULES_SUMMARY =
  '19×19 棋盘，黑先白后。无气的对方棋子会被整块提掉；禁止自杀，也不能立即回提形成劫争。双方连续停一手即结束，按中国规则数子（棋子 + 围空），白贴 7.5 目，多者胜。'