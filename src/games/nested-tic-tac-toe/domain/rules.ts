import type { Transition } from '@/core/contracts/game'
import {
  NESTED_BOARD_SIZE,
  type NestedTicTacToeAction,
  type NestedTicTacToeCellValue,
  type NestedTicTacToeCoord,
  type NestedTicTacToeEvent,
  type NestedTicTacToeMicroResult,
  type NestedTicTacToeSide,
  type NestedTicTacToeState,
} from './types'

const MACRO_SIZE = 3

/** 小棋盘与大棋盘共用的 8 条三连线（0..8 索引）。 */
const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const

const ALL_MACRO_BOARDS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const

export function isNestedTicTacToeSide(value: string): value is NestedTicTacToeSide {
  return value === 'red' || value === 'blue'
}

export function opponentOf(side: NestedTicTacToeSide): NestedTicTacToeSide {
  return side === 'red' ? 'blue' : 'red'
}

export function isInBounds(row: number, col: number): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < NESTED_BOARD_SIZE &&
    col >= 0 &&
    col < NESTED_BOARD_SIZE
  )
}

export function indexOf(row: number, col: number): number {
  return row * NESTED_BOARD_SIZE + col
}

export function macroIndexOf(row: number, col: number): number {
  return Math.floor(row / MACRO_SIZE) * MACRO_SIZE + Math.floor(col / MACRO_SIZE)
}

export function macroRowOf(board: number): number {
  return Math.floor(board / MACRO_SIZE)
}

export function macroColOf(board: number): number {
  return board % MACRO_SIZE
}

export function innerIndexOf(row: number, col: number): number {
  return (row % MACRO_SIZE) * MACRO_SIZE + (col % MACRO_SIZE)
}

/** 小棋盘内的 0..8 位置 -> 9×9 行优先扁平数组下标。 */
export function innerCellIndex(board: number, inner: number): number {
  assertBoardIndex(board)
  const baseRow = macroRowOf(board) * MACRO_SIZE
  const baseCol = macroColOf(board) * MACRO_SIZE
  return indexOf(baseRow + Math.floor(inner / MACRO_SIZE), baseCol + (inner % MACRO_SIZE))
}

function cellSide(value: NestedTicTacToeCellValue): NestedTicTacToeSide | null {
  return value === 'empty' ? null : value
}

function assertBoardIndex(board: number): void {
  if (!Number.isInteger(board) || board < 0 || board >= ALL_MACRO_BOARDS.length) {
    throw new Error(`小棋盘索引必须是 0..8，收到 ${board}`)
  }
}

/** 返回该小棋盘的三连线（宫内索引 0..8）；无三连返回 null。 */
export function microBoardWinningLine(
  cells: readonly NestedTicTacToeCellValue[],
  board: number,
): readonly number[] | null {
  assertBoardIndex(board)
  for (const line of LINES) {
    const first = cellSide(cells[innerCellIndex(board, line[0])])
    if (first === null) {
      continue
    }
    if (
      first === cells[innerCellIndex(board, line[1])] &&
      first === cells[innerCellIndex(board, line[2])]
    ) {
      return line
    }
  }
  return null
}

/** 先判三连，再判落满：落满但有三连的小棋盘仍算占领。 */
export function microBoardResult(
  cells: readonly NestedTicTacToeCellValue[],
  board: number,
): NestedTicTacToeMicroResult {
  const line = microBoardWinningLine(cells, board)
  if (line !== null) {
    return cellSide(cells[innerCellIndex(board, line[0])])
  }
  for (let inner = 0; inner < 9; inner += 1) {
    if (cells[innerCellIndex(board, inner)] === 'empty') {
      return null
    }
  }
  return 'draw'
}

export function microBoardResults(
  cells: readonly NestedTicTacToeCellValue[],
): readonly NestedTicTacToeMicroResult[] {
  return ALL_MACRO_BOARDS.map((board) => microBoardResult(cells, board))
}

export interface NestedMacroOutcome {
  readonly winner: NestedTicTacToeSide | null
  readonly line: readonly number[] | null
  readonly allResolved: boolean
}

export function resolveMacroOutcome(
  results: readonly NestedTicTacToeMicroResult[],
): NestedMacroOutcome {
  if (results.length !== ALL_MACRO_BOARDS.length) {
    throw new Error(`小棋盘结果数量必须是 9，收到 ${results.length}`)
  }
  for (const side of ['red', 'blue'] as const) {
    for (const line of LINES) {
      if (
        results[line[0]] === side &&
        results[line[1]] === side &&
        results[line[2]] === side
      ) {
        return { winner: side, line, allResolved: false }
      }
    }
  }
  return {
    winner: null,
    line: null,
    allResolved: results.every((result) => result !== null),
  }
}

/** 落点在宫内位置（0..8）决定下一手被送到哪个小棋盘；目标宫已封盘时返回 null。 */
export function forcedMacroBoardIndex(
  state: Pick<NestedTicTacToeState, 'cells' | 'lastMove'>,
): number | null {
  if (state.lastMove === null) {
    return null
  }
  const board = innerIndexOf(state.lastMove.row, state.lastMove.col)
  return microBoardResult(state.cells, board) === null ? board : null
}

export function createInitialState(): NestedTicTacToeState {
  return {
    cells: Array<NestedTicTacToeCellValue>(NESTED_BOARD_SIZE * NESTED_BOARD_SIZE).fill('empty'),
    currentPlayer: 'red',
    lastMove: null,
    status: 'playing',
    winner: null,
    moveCount: 0,
  }
}

export function listLegalActions(
  state: Readonly<NestedTicTacToeState>,
  playerId: NestedTicTacToeSide,
): readonly NestedTicTacToeAction[] {
  if (state.status !== 'playing' || state.currentPlayer !== playerId) {
    return []
  }

  const forced = forcedMacroBoardIndex(state)
  const boards = forced === null ? ALL_MACRO_BOARDS : [forced]
  const actions: NestedTicTacToeAction[] = []

  for (const board of boards) {
    if (microBoardResult(state.cells, board) !== null) {
      continue
    }
    for (let inner = 0; inner < 9; inner += 1) {
      const index = innerCellIndex(board, inner)
      if (state.cells[index] === 'empty') {
        actions.push({
          type: 'place',
          row: Math.floor(index / NESTED_BOARD_SIZE),
          col: index % NESTED_BOARD_SIZE,
        })
      }
    }
  }

  return actions
}

/** 单步落子是否满足坐标、空格、强制宫与未封盘约束（不检查回合）。 */
export function isLegalMove(
  state: Readonly<NestedTicTacToeState>,
  action: NestedTicTacToeAction,
): boolean {
  if (state.status !== 'playing') {
    return false
  }
  const { row, col } = action
  if (!isInBounds(row, col)) {
    return false
  }
  if (state.cells[indexOf(row, col)] !== 'empty') {
    return false
  }
  const board = macroIndexOf(row, col)
  if (microBoardResult(state.cells, board) !== null) {
    return false
  }
  const forced = forcedMacroBoardIndex(state)
  return forced === null || forced === board
}

export interface NestedPlaceOutcome {
  readonly cells: readonly NestedTicTacToeCellValue[]
  readonly microResults: readonly NestedTicTacToeMicroResult[]
  readonly board: number
  readonly previousResult: NestedTicTacToeMicroResult
  readonly claimed: NestedTicTacToeMicroResult
  readonly macro: NestedMacroOutcome
  readonly forcedBoard: number | null
}

/**
 * 纯推演：规则层与 AI 共用的唯一落子实现。
 * 调用方负责保证落点合法；这里仍会检查坐标范围与空格。
 */
export function simulatePlace(
  cells: readonly NestedTicTacToeCellValue[],
  side: NestedTicTacToeSide,
  row: number,
  col: number,
): NestedPlaceOutcome {
  if (!isInBounds(row, col)) {
    throw new Error(`落点超出棋盘：(${row}, ${col})`)
  }
  const board = macroIndexOf(row, col)
  const previousResult = microBoardResult(cells, board)
  const next = cells.slice()
  next[indexOf(row, col)] = side
  const microResults = microBoardResults(next)
  const claimed = microResults[board] ?? null
  const macro = resolveMacroOutcome(microResults)
  const forcedBoard =
    macro.winner === null ? forcedBoardAfterMove(next, { row, col }) : null
  return { cells: next, microResults, board, previousResult, claimed, macro, forcedBoard }
}

function forcedBoardAfterMove(
  cells: readonly NestedTicTacToeCellValue[],
  lastMove: NestedTicTacToeCoord,
): number | null {
  const board = innerIndexOf(lastMove.row, lastMove.col)
  return microBoardResult(cells, board) === null ? board : null
}

export function applyAction(
  state: Readonly<NestedTicTacToeState>,
  playerId: NestedTicTacToeSide,
  action: NestedTicTacToeAction,
): Transition<NestedTicTacToeState, NestedTicTacToeEvent> {
  if (state.status !== 'playing' || state.currentPlayer !== playerId) {
    throw new Error('非法状态：对局未进行或非当前玩家')
  }
  const { row, col } = action
  if (!isInBounds(row, col)) {
    throw new Error(`非法落子：坐标超出棋盘 (${row}, ${col})`)
  }
  const board = macroIndexOf(row, col)
  const forced = forcedMacroBoardIndex(state)
  if (forced !== null && board !== forced) {
    throw new Error(`非法落子：本手必须落在第 ${forced} 个小棋盘`)
  }
  if (state.cells[indexOf(row, col)] !== 'empty') {
    throw new Error('非法落子：该格已有棋子')
  }
  if (microBoardResult(state.cells, board) !== null) {
    throw new Error('非法落子：该小棋盘已经封盘')
  }

  const outcome = simulatePlace(state.cells, playerId, row, col)
  const events: NestedTicTacToeEvent[] = [{ type: 'cell.placed', playerId, row, col }]

  if (outcome.previousResult === null) {
    if (outcome.claimed === playerId) {
      const line = microBoardWinningLine(outcome.cells, board)
      if (line === null) {
        throw new Error('规则不一致：占领小棋盘却找不到三连线')
      }
      events.push({ type: 'micro.claimed', playerId, board, line })
    } else if (outcome.claimed === 'draw') {
      events.push({ type: 'micro.drawn', board })
    }
  }

  const baseState = {
    ...state,
    cells: outcome.cells,
    lastMove: { row, col },
    moveCount: state.moveCount + 1,
  }

  if (outcome.macro.winner !== null) {
    events.push({
      type: 'game.finished',
      result: { outcome: 'win', winner: outcome.macro.winner },
    })
    return {
      state: {
        ...baseState,
        status: 'completed',
        currentPlayer: null,
        winner: outcome.macro.winner,
      },
      events,
    }
  }

  if (outcome.macro.allResolved) {
    events.push({ type: 'game.finished', result: { outcome: 'draw' } })
    return {
      state: {
        ...baseState,
        status: 'completed',
        currentPlayer: null,
        winner: null,
      },
      events,
    }
  }

  return {
    state: {
      ...baseState,
      status: 'playing',
      currentPlayer: opponentOf(playerId),
      winner: null,
    },
    events,
  }
}

/** 该小棋盘内，side 是否有一手成线的机会。 */
export function hasImmediateMicroWin(
  cells: readonly NestedTicTacToeCellValue[],
  board: number,
  side: NestedTicTacToeSide,
): boolean {
  if (microBoardResult(cells, board) !== null) {
    return false
  }
  return countMicroThreats(cells, board, side) > 0
}

/** 该小棋盘内，side 的「两子 + 一个空位」威胁数量。 */
export function countMicroThreats(
  cells: readonly NestedTicTacToeCellValue[],
  board: number,
  side: NestedTicTacToeSide,
): number {
  assertBoardIndex(board)
  let count = 0
  for (const line of LINES) {
    let own = 0
    let empty = 0
    let blocked = false
    for (const inner of line) {
      const value = cells[innerCellIndex(board, inner)]
      if (value === side) {
        own += 1
      } else if (value === 'empty') {
        empty += 1
      } else {
        blocked = true
        break
      }
    }
    if (!blocked && own === 2 && empty === 1) {
      count += 1
    }
  }
  return count
}

/** 大棋盘上，side 的「两宫 + 一个未封宫」威胁数量。 */
export function countMacroThreats(
  results: readonly NestedTicTacToeMicroResult[],
  side: NestedTicTacToeSide,
): number {
  if (results.length !== ALL_MACRO_BOARDS.length) {
    throw new Error(`小棋盘结果数量必须是 9，收到 ${results.length}`)
  }
  let count = 0
  for (const line of LINES) {
    let own = 0
    let open = 0
    let blocked = false
    for (const board of line) {
      const result = results[board]
      if (result === side) {
        own += 1
      } else if (result === null) {
        open += 1
      } else {
        blocked = true
        break
      }
    }
    if (!blocked && own === 2 && open === 1) {
      count += 1
    }
  }
  return count
}