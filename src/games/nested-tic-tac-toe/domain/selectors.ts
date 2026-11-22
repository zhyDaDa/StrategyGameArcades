import type { GameResult } from '@/core/contracts/result'
import {
  forcedMacroBoardIndex,
  indexOf,
  listLegalActions,
  microBoardResults,
  microBoardWinningLine,
  resolveMacroOutcome,
  type NestedMacroOutcome,
} from './rules'
import type {
  NestedTicTacToeCellValue,
  NestedTicTacToeCoord,
  NestedTicTacToeEvent,
  NestedTicTacToeMicroResult,
  NestedTicTacToeSide,
  NestedTicTacToeState,
} from './types'

export type NestedTicTacToeEndReason = 'macro-line' | 'all-resolved'

export function selectResult(state: Readonly<NestedTicTacToeState>): GameResult | null {
  if (state.status !== 'completed') {
    return null
  }
  return state.winner !== null
    ? { outcome: 'win', winner: state.winner }
    : { outcome: 'draw' }
}

export function selectEndReason(
  state: Readonly<NestedTicTacToeState>,
): NestedTicTacToeEndReason | null {
  if (state.status !== 'completed') {
    return null
  }
  return state.winner !== null ? 'macro-line' : 'all-resolved'
}

export function selectMicroBoardResults(
  state: Readonly<NestedTicTacToeState>,
): readonly NestedTicTacToeMicroResult[] {
  return microBoardResults(state.cells)
}

export function selectCapturedCounts(
  state: Readonly<NestedTicTacToeState>,
): Record<NestedTicTacToeSide, number> {
  const results = microBoardResults(state.cells)
  return {
    red: results.filter((result) => result === 'red').length,
    blue: results.filter((result) => result === 'blue').length,
  }
}

export function selectMacroOutcome(
  state: Readonly<NestedTicTacToeState>,
): NestedMacroOutcome {
  return resolveMacroOutcome(microBoardResults(state.cells))
}

export function selectForcedBoard(
  state: Readonly<NestedTicTacToeState>,
): number | null {
  if (state.status !== 'playing') {
    return null
  }
  return forcedMacroBoardIndex(state)
}

/** 最近一次 transition 刚落下的格子；没有落子事件时返回 null。 */
export function selectFreshPlacedCell(
  events: readonly NestedTicTacToeEvent[],
): NestedTicTacToeCoord | null {
  let placed: NestedTicTacToeCoord | null = null
  for (const event of events) {
    if (event.type === 'cell.placed') {
      placed = { row: event.row, col: event.col }
    }
  }
  return placed
}

/** 最近一次 transition 中被占领或封死的小棋盘，用于一次性刷色。 */
export function selectFreshMicroBoards(
  events: readonly NestedTicTacToeEvent[],
): ReadonlySet<number> {
  const boards = new Set<number>()
  for (const event of events) {
    if (event.type === 'micro.claimed' || event.type === 'micro.drawn') {
      boards.add(event.board)
    }
  }
  return boards
}

export interface NestedTicTacToeBoardViewModel {
  readonly cells: readonly NestedTicTacToeCellValue[]
  readonly currentSide: NestedTicTacToeSide | null
  readonly microResults: readonly NestedTicTacToeMicroResult[]
  readonly microLines: readonly (readonly number[] | null)[]
  readonly legalCells: readonly boolean[]
  readonly forcedBoard: number | null
  readonly lastMove: NestedTicTacToeCoord | null
  readonly macroLine: readonly number[] | null
  readonly interactive: boolean
}

/** State -> 棋盘展示数据；合法格由规则层派生，组件不再自行判断。 */
export function selectNestedTicTacToeBoardViewModel(
  state: Readonly<NestedTicTacToeState>,
): NestedTicTacToeBoardViewModel {
  const microResults = microBoardResults(state.cells)
  const macro = resolveMacroOutcome(microResults)
  const currentSide = state.status === 'playing' ? state.currentPlayer : null
  const legalCells = Array<boolean>(state.cells.length).fill(false)

  if (currentSide !== null) {
    for (const action of listLegalActions(state, currentSide)) {
      legalCells[indexOf(action.row, action.col)] = true
    }
  }

  return {
    cells: state.cells,
    currentSide,
    microResults,
    microLines: microResults.map((_, board) => microBoardWinningLine(state.cells, board)),
    legalCells,
    forcedBoard: state.status === 'playing' ? forcedMacroBoardIndex(state) : null,
    lastMove: state.lastMove,
    macroLine: macro.line,
    interactive: state.status === 'playing',
  }
}