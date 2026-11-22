import type { GameResult } from '@/core/contracts/result'

export const NESTED_BOARD_SIZE = 9
export const NESTED_MACRO_SIZE = 3

export const NESTED_SIDES = ['red', 'blue'] as const
export type NestedTicTacToeSide = (typeof NESTED_SIDES)[number]

export const NESTED_CELL_VALUES = ['empty', 'red', 'blue'] as const
export type NestedTicTacToeCellValue = (typeof NESTED_CELL_VALUES)[number]

/** 小棋盘结果：null = 进行中；'draw' = 落满无三连；红/蓝 = 已占领。 */
export type NestedTicTacToeMicroResult = NestedTicTacToeSide | 'draw' | null

export interface NestedTicTacToeCoord {
  readonly row: number
  readonly col: number
}

export type NestedTicTacToeAction = {
  readonly type: 'place'
  readonly row: number
  readonly col: number
}

export type NestedTicTacToeStatus = 'playing' | 'completed'

export interface NestedTicTacToeState {
  /** 9×9 行优先扁平数组：index = row * 9 + col；小棋盘格子不连续。 */
  readonly cells: readonly NestedTicTacToeCellValue[]
  readonly currentPlayer: NestedTicTacToeSide | null
  readonly lastMove: NestedTicTacToeCoord | null
  readonly status: NestedTicTacToeStatus
  readonly winner: NestedTicTacToeSide | null
  readonly moveCount: number
}

export type NestedTicTacToeEvent =
  | {
      readonly type: 'cell.placed'
      readonly playerId: NestedTicTacToeSide
      readonly row: number
      readonly col: number
    }
  | {
      readonly type: 'micro.claimed'
      readonly playerId: NestedTicTacToeSide
      readonly board: number
      readonly line: readonly number[]
    }
  | { readonly type: 'micro.drawn'; readonly board: number }
  | { readonly type: 'game.finished'; readonly result: GameResult }

export interface NestedTicTacToeObservation {
  /** 9×9 行优先扁平数组：index = row * 9 + col；小棋盘格子不连续。 */
  readonly cells: readonly NestedTicTacToeCellValue[]
  readonly currentPlayer: NestedTicTacToeSide | null
  readonly lastMove: NestedTicTacToeCoord | null
  readonly status: NestedTicTacToeStatus
  readonly moveCount: number
}