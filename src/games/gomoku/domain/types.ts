import type { GameResult } from '@/core/contracts/result'

export const GOMOKU_BOARD_SIZE = 15

export const GomokuSide = ['black', 'white'] as const
export type GomokuSide = (typeof GomokuSide)[number]

export const GomokuCellValue = ['empty', 'black', 'white'] as const
export type GomokuCellValue = (typeof GomokuCellValue)[number]

export interface GomokuCoord {
  readonly row: number
  readonly col: number
}

export type GomokuAction =
  | { readonly type: 'place'; readonly row: number; readonly col: number }
  | { readonly type: 'resign' }

export type GomokuStatus = 'playing' | 'completed'

/** 只存事实：棋盘、当前玩家、生命期状态、终局赢家、最后落子与步数。 */
export interface GomokuState {
  readonly size: number
  readonly cells: readonly GomokuCellValue[]
  readonly status: GomokuStatus
  readonly currentPlayer: GomokuSide | null
  readonly winner: GomokuSide | null
  readonly lastMove: GomokuCoord | null
  readonly moveCount: number
}

export type GomokuEvent =
  | { readonly type: 'piece.placed'; readonly playerId: GomokuSide; readonly row: number; readonly col: number }
  | { readonly type: 'game.finished'; readonly result: GameResult }

/** 完全信息博弈：当前玩家可见的公开信息。 */
export interface GomokuObservation {
  readonly size: number
  readonly cells: readonly GomokuCellValue[]
  readonly status: GomokuStatus
  readonly currentPlayer: GomokuSide | null
  readonly lastMove: GomokuCoord | null
  readonly moveCount: number
}