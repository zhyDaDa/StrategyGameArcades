import type { GameResult } from '@/core/contracts/result'

/** 8×8 棋盘，row 0 是黑方底线（第 8 横线），row 7 是白方底线（第 1 横线）。 */
export const CHESS_ROWS = 8
export const CHESS_COLS = 8

/** 连续 100 个半回合（50 回合）未吃子或走兵即判和。 */
export const CHESS_FIFTY_MOVE_HALFMOVES = 100

export const CHESS_SIDES = ['white', 'black'] as const
export type ChessSide = (typeof CHESS_SIDES)[number]

export const CHESS_PIECE_TYPES = [
  'king',
  'queen',
  'rook',
  'bishop',
  'knight',
  'pawn',
] as const
export type ChessPieceType = (typeof CHESS_PIECE_TYPES)[number]

export const CHESS_PROMOTION_TYPES = ['queen', 'rook', 'bishop', 'knight'] as const
export type ChessPromotionType = (typeof CHESS_PROMOTION_TYPES)[number]

export const CHESS_CASTLE_SIDES = ['king-side', 'queen-side'] as const
export type ChessCastleSide = (typeof CHESS_CASTLE_SIDES)[number]

export interface ChessPiece {
  readonly side: ChessSide
  readonly type: ChessPieceType
}

export interface ChessCoord {
  readonly row: number
  readonly col: number
}

export interface ChessCastlingRights {
  readonly kingSide: boolean
  readonly queenSide: boolean
}

export interface ChessCastlingBySide {
  readonly white: ChessCastlingRights
  readonly black: ChessCastlingRights
}

/** 规则计算需要的局面事实；State / Observation 都包含这些字段。 */
export interface ChessPosition {
  readonly rows: number
  readonly cols: number
  readonly cells: readonly (ChessPiece | null)[]
  readonly castling: ChessCastlingBySide
  /** 兵刚走两格后留下的「可被吃过路兵」目标格；否则为 null。 */
  readonly enPassantTarget: ChessCoord | null
}

export type ChessAction = {
  readonly type: 'move'
  readonly from: ChessCoord
  readonly to: ChessCoord
  /** 兵到达底线时必须给出升变棋子；其他走法不填写。 */
  readonly promotion?: ChessPromotionType | null
}

export type ChessStatus = 'playing' | 'completed'

export const CHESS_END_REASONS = [
  'checkmate',
  'stalemate',
  'insufficient-material',
  'fifty-move-draw',
] as const
export type ChessEndReason = (typeof CHESS_END_REASONS)[number]

export interface ChessLastMove {
  readonly from: ChessCoord
  readonly to: ChessCoord
  /** 移动前的棋子（升变时仍是兵）。 */
  readonly piece: ChessPiece
  readonly captured: ChessPiece | null
  readonly promotion: ChessPromotionType | null
  readonly castleSide: ChessCastleSide | null
  readonly enPassant: boolean
}

/** 只存事实：棋盘、易位权利、吃过路兵目标、半回合计数；将军与结果由 Selector 计算。 */
export interface ChessState extends ChessPosition {
  readonly status: ChessStatus
  readonly currentPlayer: ChessSide | null
  readonly winner: ChessSide | null
  readonly endReason: ChessEndReason | null
  readonly lastMove: ChessLastMove | null
  readonly moveCount: number
  readonly halfmoveClock: number
}

export type ChessEvent =
  | {
      readonly type: 'piece.moved'
      readonly playerId: ChessSide
      readonly from: ChessCoord
      readonly to: ChessCoord
      readonly piece: ChessPiece
      readonly captured: ChessPiece | null
      readonly promotion: ChessPromotionType | null
      readonly castleSide: ChessCastleSide | null
      readonly enPassant: boolean
    }
  | {
      readonly type: 'check.given'
      readonly playerId: ChessSide
      readonly checkedPlayerId: ChessSide
    }
  | {
      readonly type: 'game.finished'
      readonly result: GameResult
      readonly reason: ChessEndReason
    }

/** 完全信息博弈：当前玩家看到的公开事实。 */
export interface ChessObservation extends ChessPosition {
  readonly status: ChessStatus
  readonly currentPlayer: ChessSide | null
  readonly lastMove: ChessLastMove | null
  readonly moveCount: number
  readonly halfmoveClock: number
}