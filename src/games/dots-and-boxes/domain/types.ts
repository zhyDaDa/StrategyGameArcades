import type { GameResult } from '@/core/contracts/result'

/** 席位顺序固定：人数增加时按此顺序取前缀，颜色与符号不随人数变化。 */
export const DOTS_AND_BOXES_SEATS = ['red', 'blue', 'green', 'yellow'] as const
export type DotsAndBoxesSeat = (typeof DOTS_AND_BOXES_SEATS)[number]

/** 棋盘尺寸指「方格数」；实际点阵是 (size + 1) × (size + 1)。 */
export const DOTS_BOARD_SIZES = [8, 12, 15, 18] as const
export type DotsBoardSize = (typeof DOTS_BOARD_SIZES)[number]

export const DotsEdgeOrientation = ['horizontal', 'vertical'] as const
export type DotsEdgeOrientation = (typeof DotsEdgeOrientation)[number]

/** 一根边：横边连接 (row,col)-(row,col+1)，竖边连接 (row,col)-(row+1,col)。 */
export interface DotsEdge {
  readonly orientation: DotsEdgeOrientation
  readonly row: number
  readonly col: number
}

export interface DotsBox {
  readonly row: number
  readonly col: number
}

export type DotsAndBoxesAction = {
  readonly type: 'draw-edge'
  readonly orientation: DotsEdgeOrientation
  readonly row: number
  readonly col: number
}

export type DotsAndBoxesStatus = 'playing' | 'completed'

/** 只存事实：已画的边、归属方、当前玩家、终局赢家；分数由 boxes 派生。 */
export interface DotsAndBoxesState {
  readonly boxSize: number
  readonly players: readonly DotsAndBoxesSeat[]
  readonly horizontalEdges: readonly (DotsAndBoxesSeat | null)[]
  readonly verticalEdges: readonly (DotsAndBoxesSeat | null)[]
  readonly boxes: readonly (DotsAndBoxesSeat | null)[]
  readonly currentPlayer: DotsAndBoxesSeat | null
  readonly status: DotsAndBoxesStatus
  readonly winner: DotsAndBoxesSeat | null
  readonly lastEdge: DotsEdge | null
  readonly moveCount: number
}

export type DotsAndBoxesEvent =
  | {
      readonly type: 'edge.drawn'
      readonly playerId: DotsAndBoxesSeat
      readonly edge: DotsEdge
    }
  | {
      readonly type: 'box.claimed'
      readonly playerId: DotsAndBoxesSeat
      readonly box: DotsBox
    }
  | { readonly type: 'game.finished'; readonly result: GameResult }

/** 完全信息博弈：观察结果就是当前公开局面。 */
export interface DotsAndBoxesObservation {
  readonly boxSize: number
  readonly players: readonly DotsAndBoxesSeat[]
  readonly horizontalEdges: readonly (DotsAndBoxesSeat | null)[]
  readonly verticalEdges: readonly (DotsAndBoxesSeat | null)[]
  readonly boxes: readonly (DotsAndBoxesSeat | null)[]
  readonly currentPlayer: DotsAndBoxesSeat | null
  readonly status: DotsAndBoxesStatus
  readonly lastEdge: DotsEdge | null
  readonly moveCount: number
}