import { describe, expect, it } from 'vitest'
import { nestedTicTacToeStateSchema } from '../domain/schema'
import {
  applyAction,
  createInitialState,
  forcedMacroBoardIndex,
  indexOf,
  innerCellIndex,
  innerIndexOf,
  isLegalMove,
  listLegalActions,
  macroColOf,
  macroIndexOf,
  macroRowOf,
  microBoardResult,
  simulatePlace,
} from '../domain/rules'
import type { NestedTicTacToeCellValue, NestedTicTacToeState } from '../domain/types'

const DRAW_BOARD: readonly NestedTicTacToeCellValue[] = [
  'red', 'blue', 'red',
  'red', 'blue', 'blue',
  'blue', 'red', 'red',
]

function emptyCells(): NestedTicTacToeCellValue[] {
  return Array<NestedTicTacToeCellValue>(81).fill('empty')
}

function setBoard(
  cells: NestedTicTacToeCellValue[],
  board: number,
  values: readonly NestedTicTacToeCellValue[],
): void {
  values.forEach((value, inner) => {
    cells[innerCellIndex(board, inner)] = value
  })
}

function makeState(
  cells: readonly NestedTicTacToeCellValue[],
  overrides: Partial<Omit<NestedTicTacToeState, 'cells'>> = {},
): NestedTicTacToeState {
  return {
    cells,
    currentPlayer: 'red',
    lastMove: null,
    status: 'playing',
    winner: null,
    moveCount: 0,
    ...overrides,
  }
}

describe('九宫井字棋规则', () => {
  it('初始局面：81 空、红方先行、任意落子', () => {
    const state = createInitialState()
    expect(state.cells).toHaveLength(81)
    expect(state.cells.every((cell) => cell === 'empty')).toBe(true)
    expect(state.currentPlayer).toBe('red')
    expect(listLegalActions(state, 'red')).toHaveLength(81)
    expect(listLegalActions(state, 'blue')).toHaveLength(0)
    expect(forcedMacroBoardIndex(state)).toBeNull()
  })

  it('坐标映射：宫、宫内索引与行列', () => {
    expect(macroIndexOf(4, 4)).toBe(4)
    expect(macroRowOf(4)).toBe(1)
    expect(macroColOf(4)).toBe(1)
    expect(macroIndexOf(3, 0)).toBe(3)
    expect(innerIndexOf(3, 0)).toBe(0)
    expect(innerCellIndex(4, 0)).toBe(indexOf(3, 3))
    expect(innerCellIndex(4, 4)).toBe(indexOf(4, 4))
    expect(innerCellIndex(4, 8)).toBe(indexOf(5, 5))
    expect(indexOf(8, 8)).toBe(80)
  })

  it('首手后对手被强制送到对应小棋盘', () => {
    const state = applyAction(createInitialState(), 'red', { type: 'place', row: 0, col: 0 }).state
    expect(forcedMacroBoardIndex(state)).toBe(0)
    const legal = listLegalActions(state, 'blue')
    expect(legal).toHaveLength(8)
    expect(legal.every((action) => macroIndexOf(action.row, action.col) === 0)).toBe(true)
  })

  it('下一手由落点的宫内位置决定，而不是落点所在的宫', () => {
    const state = applyAction(createInitialState(), 'red', { type: 'place', row: 3, col: 0 }).state
    expect(macroIndexOf(3, 0)).toBe(3)
    expect(innerIndexOf(3, 0)).toBe(0)
    expect(forcedMacroBoardIndex(state)).toBe(0)
    expect(
      listLegalActions(state, 'blue').every(
        (action) => macroIndexOf(action.row, action.col) === 0,
      ),
    ).toBe(true)
  })

  it('小棋盘三连后占领，并把自由落子权交给对手', () => {
    let state = createInitialState()
    state = applyAction(state, 'red', { type: 'place', row: 0, col: 1 }).state
    state = applyAction(state, 'blue', { type: 'place', row: 0, col: 3 }).state
    state = applyAction(state, 'red', { type: 'place', row: 0, col: 2 }).state
    state = applyAction(state, 'blue', { type: 'place', row: 0, col: 6 }).state
    const transition = applyAction(state, 'red', { type: 'place', row: 0, col: 0 })

    expect(microBoardResult(transition.state.cells, 0)).toBe('red')
    expect(transition.events).toContainEqual({
      type: 'micro.claimed',
      playerId: 'red',
      board: 0,
      line: [0, 1, 2],
    })
    expect(forcedMacroBoardIndex(transition.state)).toBeNull()
    expect(transition.state.currentPlayer).toBe('blue')
    expect(listLegalActions(transition.state, 'blue')).toHaveLength(70)
  })

  it('占领小棋盘后，若宫内位置指向另一块未封盘小棋盘，对手会被送过去而不是自由落子', () => {
    const cells = emptyCells()
    setBoard(cells, 0, ['red', 'empty', 'red', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    cells[indexOf(0, 3)] = 'blue'
    const state = makeState(cells, {
      currentPlayer: 'red',
      lastMove: { row: 0, col: 3 },
      moveCount: 3,
    })

    const transition = applyAction(state, 'red', { type: 'place', row: 0, col: 1 })
    expect(microBoardResult(transition.state.cells, 0)).toBe('red')
    expect(forcedMacroBoardIndex(transition.state)).toBe(1)
    const legal = listLegalActions(transition.state, 'blue')
    expect(legal).toHaveLength(8)
    expect(legal.every((action) => macroIndexOf(action.row, action.col) === 1)).toBe(true)
  })

  it('小棋盘落满但无三连时成为死格，并可自由落子', () => {
    const cells = emptyCells()
    setBoard(cells, 0, DRAW_BOARD)
    const state = makeState(cells, {
      currentPlayer: 'blue',
      lastMove: { row: 0, col: 0 },
      moveCount: 9,
    })

    expect(microBoardResult(cells, 0)).toBe('draw')
    expect(forcedMacroBoardIndex(state)).toBeNull()
    expect(listLegalActions(state, 'blue')).toHaveLength(72)
    expect(nestedTicTacToeStateSchema.parse(state)).toEqual(state)
  })

  it('落满但有三连的小棋盘仍算占领', () => {
    const cells = emptyCells()
    setBoard(cells, 0, [
      'red', 'red', 'red',
      'blue', 'blue', 'red',
      'blue', 'red', 'blue',
    ])
    expect(microBoardResult(cells, 0)).toBe('red')
  })

  it('非 0 号宫的三连按局部 3×3 判定', () => {
    const cells = emptyCells()
    setBoard(cells, 4, [
      'red', 'empty', 'empty',
      'empty', 'red', 'empty',
      'empty', 'empty', 'red',
    ])
    expect(microBoardResult(cells, 4)).toBe('red')
    expect(microBoardResult(cells, 0)).toBeNull()
  })

  it('大棋盘三连：完成小棋盘三连的同时赢下整局', () => {
    const cells = emptyCells()
    setBoard(cells, 0, ['red', 'red', 'red', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    setBoard(cells, 1, ['red', 'red', 'red', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    setBoard(cells, 2, ['red', 'red', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    cells[indexOf(6, 8)] = 'blue'
    const state = makeState(cells, {
      currentPlayer: 'red',
      lastMove: { row: 6, col: 8 },
      moveCount: 9,
    })

    const transition = applyAction(state, 'red', { type: 'place', row: 0, col: 8 })
    expect(transition.state.status).toBe('completed')
    expect(transition.state.currentPlayer).toBeNull()
    expect(transition.state.winner).toBe('red')
    expect(transition.events).toContainEqual({
      type: 'micro.claimed',
      playerId: 'red',
      board: 2,
      line: [0, 1, 2],
    })
    expect(transition.events).toContainEqual({
      type: 'game.finished',
      result: { outcome: 'win', winner: 'red' },
    })
    expect(transition.state.moveCount).toBe(10)
  })

  it('九宫未全部落定时，大棋盘没有三连就不结束', () => {
    const cells = emptyCells()
    for (const board of [0, 1, 3, 4]) {
      setBoard(cells, board, ['red', 'red', 'red', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    }
    for (const board of [5, 6, 7, 8]) {
      setBoard(cells, board, DRAW_BOARD)
    }
    cells[indexOf(0, 8)] = 'blue'
    const state = makeState(cells, {
      currentPlayer: 'red',
      lastMove: { row: 0, col: 8 },
      moveCount: 49,
    })

    const transition = applyAction(state, 'red', { type: 'place', row: 0, col: 6 })
    expect(transition.state.status).toBe('playing')
    expect(transition.state.winner).toBeNull()
  })

  it('九宫全部落定且无宏线时平局', () => {
    const cells = emptyCells()
    for (let board = 0; board < 8; board += 1) {
      setBoard(cells, board, DRAW_BOARD)
    }
    const lastBoard = DRAW_BOARD.slice()
    lastBoard[1] = 'empty'
    setBoard(cells, 8, lastBoard)
    const state = makeState(cells, {
      currentPlayer: 'blue',
      lastMove: { row: 2, col: 2 },
      moveCount: 80,
    })

    const transition = applyAction(state, 'blue', { type: 'place', row: 6, col: 7 })
    expect(transition.state.status).toBe('completed')
    expect(transition.state.winner).toBeNull()
    expect(transition.state.currentPlayer).toBeNull()
    expect(transition.state.moveCount).toBe(81)
    expect(transition.events).toContainEqual({ type: 'micro.drawn', board: 8 })
    expect(transition.events).toContainEqual({
      type: 'game.finished',
      result: { outcome: 'draw' },
    })
  })

  it('applyAction 不修改输入，且相同输入结果一致', () => {
    const state = createInitialState()
    const before = JSON.stringify(state)
    const a = applyAction(state, 'red', { type: 'place', row: 4, col: 4 })
    const b = applyAction(state, 'red', { type: 'place', row: 4, col: 4 })
    expect(JSON.stringify(state)).toBe(before)
    expect(a).toEqual(b)
  })

  it('simulatePlace 与 applyAction 的落子结果一致', () => {
    const state = createInitialState()
    const outcome = simulatePlace(state.cells, 'red', 4, 4)
    const transition = applyAction(state, 'red', { type: 'place', row: 4, col: 4 })
    expect(outcome.cells).toEqual(transition.state.cells)
    expect(outcome.forcedBoard).toBe(4)
    expect(transition.state.currentPlayer).toBe('blue')
  })

  it('非法动作：非当前玩家、已占格、强制宫外、已封盘宫', () => {
    const initial = createInitialState()
    expect(() =>
      applyAction(initial, 'blue', { type: 'place', row: 0, col: 0 }),
    ).toThrow()

    const afterFirst = applyAction(initial, 'red', { type: 'place', row: 0, col: 0 }).state
    expect(() =>
      applyAction(afterFirst, 'blue', { type: 'place', row: 4, col: 4 }),
    ).toThrow()
    expect(isLegalMove(afterFirst, { type: 'place', row: 4, col: 4 })).toBe(false)

    const cells = emptyCells()
    setBoard(cells, 0, ['red', 'red', 'red', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    cells[indexOf(1, 0)] = 'red'
    const resolved = makeState(cells)
    expect(isLegalMove(resolved, { type: 'place', row: 1, col: 1 })).toBe(false)
    expect(() =>
      applyAction(resolved, 'red', { type: 'place', row: 1, col: 1 }),
    ).toThrow()
    expect(() =>
      applyAction(resolved, 'red', { type: 'place', row: 1, col: 0 }),
    ).toThrow()
  })

  it('终局后不能再落子', () => {
    const cells = emptyCells()
    setBoard(cells, 0, ['red', 'red', 'red', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    setBoard(cells, 1, ['red', 'red', 'red', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    const state = makeState(cells, {
      currentPlayer: null,
      status: 'completed',
      winner: 'red',
      lastMove: { row: 0, col: 5 },
      moveCount: 6,
    })
    expect(listLegalActions(state, 'red')).toHaveLength(0)
    expect(() =>
      applyAction(state, 'red', { type: 'place', row: 2, col: 2 }),
    ).toThrow()
  })
})