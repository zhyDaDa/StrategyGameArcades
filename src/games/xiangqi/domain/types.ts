import type { GameResult } from '@/core/contracts/result'

/** 9 列 × 10 行交叉点，行列均以 0 为基；row 0 是黑方底线，row 9 是红方底线。 */
export const XIANGQI_ROWS = 10
export const XIANGQI_COLS = 9

/** 连续 60 回合（双方各 60 手）无吃子即判和。 */
export const XIANGQI_NO_CAPTURE_PLIES = 120

export const XIANGQI_SIDES = ['red', 'black'] as const
export type XiangqiSide = (typeof XIANGQI_SIDES)[number]

export const XIANGQI_PIECE_TYPES = [
  'general',
  'advisor',
  'elephant',
  'horse',
  'chariot',
  'cannon',
  'soldier',
] as const
export type XiangqiPieceType = (typeof XIANGQI_PIECE_TYPES)[number]

export interface XiangqiPiece {
  readonly side: XiangqiSide
  readonly type: XiangqiPieceType
}

export interface XiangqiCoord {
  readonly row: number
  readonly col: number
}

export type XiangqiAction = {
  readonly type: 'move'
  readonly from: XiangqiCoord
  readonly to: XiangqiCoord
}

export type XiangqiStatus = 'playing' | 'completed'

export const XIANGQI_END_REASONS = ['checkmate', 'stalemate', 'no-capture-draw'] as const
export type XiangqiEndReason = (typeof XIANGQI_END_REASONS)[number]

export interface XiangqiLastMove {
  readonly from: XiangqiCoord
  readonly to: XiangqiCoord
  readonly captured: XiangqiPiece | null
}

/** 只存事实：棋盘、执子方、上一手与无吃子计数；将军与结果由 Selector 计算。 */
export interface XiangqiState {
  readonly rows: number
  readonly cols: number
  readonly cells: readonly (XiangqiPiece | null)[]
  readonly status: XiangqiStatus
  readonly currentPlayer: XiangqiSide | null
  readonly winner: XiangqiSide | null
  readonly endReason: XiangqiEndReason | null
  readonly lastMove: XiangqiLastMove | null
  readonly moveCount: number
  readonly noCapturePlies: number
}

export type XiangqiEvent =
  | {
      readonly type: 'piece.moved'
      readonly playerId: XiangqiSide
      readonly from: XiangqiCoord
      readonly to: XiangqiCoord
      readonly moved: XiangqiPiece
      readonly captured: XiangqiPiece | null
    }
  | {
      readonly type: 'check.given'
      readonly playerId: XiangqiSide
      readonly checkedPlayerId: XiangqiSide
    }
  | {
      readonly type: 'game.finished'
      readonly result: GameResult
      readonly reason: XiangqiEndReason
    }

/** 完全信息博弈：当前玩家看到的公开事实。 */
export interface XiangqiObservation {
  readonly rows: number
  readonly cols: number
  readonly cells: readonly (XiangqiPiece | null)[]
  readonly status: XiangqiStatus
  readonly currentPlayer: XiangqiSide | null
  readonly lastMove: XiangqiLastMove | null
  readonly moveCount: number
  readonly noCapturePlies: number
}