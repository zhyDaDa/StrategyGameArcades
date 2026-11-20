import type { GameResult } from '@/core/contracts/result'

export const REVERSI_BOARD_SIZE = 8

export const ReversiSide = ['black', 'white'] as const
export type ReversiSide = (typeof ReversiSide)[number]

export const ReversiCellValue = ['empty', 'black', 'white'] as const
export type ReversiCellValue = (typeof ReversiCellValue)[number]

export interface ReversiCoord {
  readonly row: number
  readonly col: number
}

export type ReversiAction = { readonly type: 'place'; readonly row: number; readonly col: number }

export type ReversiStatus = 'playing' | 'completed'

export interface ReversiState {
  readonly size: number
  readonly cells: readonly ReversiCellValue[]
  readonly status: ReversiStatus
  readonly currentPlayer: ReversiSide | null
  readonly winner: ReversiSide | null
  readonly lastMove: { readonly row: number; readonly col: number; readonly flipped: readonly ReversiCoord[] } | null
  readonly moveCount: number
}

export type ReversiEvent =
  | { readonly type: 'piece.placed'; readonly playerId: ReversiSide; readonly row: number; readonly col: number; readonly flipped: readonly ReversiCoord[] }
  | { readonly type: 'turn.passed'; readonly playerId: ReversiSide }
  | { readonly type: 'game.finished'; readonly result: GameResult }

export interface ReversiObservation {
  readonly size: number
  readonly cells: readonly ReversiCellValue[]
  readonly status: ReversiStatus
  readonly currentPlayer: ReversiSide | null
  readonly lastMove: { readonly row: number; readonly col: number; readonly flipped: readonly ReversiCoord[] } | null
  readonly moveCount: number
}