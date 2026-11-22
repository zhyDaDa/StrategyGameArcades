import type { GameResult } from '@/core/contracts/result'

export const GO_BOARD_SIZE = 19

/** 中国规则贴目：白方终局额外加 7.5 目。 */
export const GO_KOMI = 7.5

export const GoSide = ['black', 'white'] as const
export type GoSide = (typeof GoSide)[number]

export const GoCellValue = ['empty', 'black', 'white'] as const
export type GoCellValue = (typeof GoCellValue)[number]

export interface GoCoord {
  readonly row: number
  readonly col: number
}

export type GoAction =
  | { readonly type: 'place'; readonly row: number; readonly col: number }
  | { readonly type: 'pass' }
  | { readonly type: 'resign' }

export type GoStatus = 'playing' | 'completed'

/** 终局原因：连续停一手后数子 / 认输。 */
export const GoEndReason = ['two-passes', 'resign'] as const
export type GoEndReason = (typeof GoEndReason)[number]

/** 中国规则数子结果：黑方 = 黑子 + 黑空，白方 = 白子 + 白空 + 贴目。 */
export interface GoScore {
  readonly black: number
  readonly white: number
  readonly komi: number
}

export interface GoCaptures {
  /** 黑方提掉的白子总数。 */
  readonly black: number
  /** 白方提掉的黑子总数。 */
  readonly white: number
}

/** 只存事实：棋盘、轮到谁、劫点、提子数、终局原因与数子结果。 */
export interface GoState {
  readonly size: number
  readonly cells: readonly GoCellValue[]
  readonly status: GoStatus
  readonly currentPlayer: GoSide | null
  readonly winner: GoSide | null
  readonly endReason: GoEndReason | null
  readonly lastMove: GoCoord | null
  readonly lastCaptured: readonly GoCoord[]
  readonly consecutivePasses: number
  /** 简单劫：当前玩家立即回提会复现上一手前局面的那个点。 */
  readonly koPoint: GoCoord | null
  readonly captured: GoCaptures
  readonly moveCount: number
  readonly score: GoScore | null
}

export type GoEvent =
  | {
      readonly type: 'stone.placed'
      readonly playerId: GoSide
      readonly row: number
      readonly col: number
      readonly captured: readonly GoCoord[]
    }
  | { readonly type: 'turn.passed'; readonly playerId: GoSide }
  | {
      readonly type: 'game.finished'
      readonly result: GameResult
      readonly reason: GoEndReason
      readonly score: GoScore | null
    }

/** 完全信息博弈：当前玩家可见的公开信息。 */
export interface GoObservation {
  readonly size: number
  readonly cells: readonly GoCellValue[]
  readonly status: GoStatus
  readonly currentPlayer: GoSide | null
  readonly lastMove: GoCoord | null
  readonly koPoint: GoCoord | null
  readonly consecutivePasses: number
  readonly moveCount: number
}