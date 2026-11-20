import { describe, expect, it } from 'vitest'
import { applyAction, createInitialState, findFlips, getLegalMoves, countWinner } from '../domain/rules'
import type { ReversiCellValue } from '../domain/types'

describe('黑白棋规则', () => {
  it('初始局面：4 枚棋子、黑先', () => {
    const state = createInitialState()
    expect(state.cells.filter((c) => c !== 'empty')).toHaveLength(4)
    expect(state.currentPlayer).toBe('black')
    expect(getLegalMoves(state.cells, state.size, 'black')).toHaveLength(4)
  })

  it('夹击翻转正确（黑 (2,3) 翻转白 (3,3)）', () => {
    const state = createInitialState()
    const flips = findFlips(state.cells, state.size, 2, 3, 'black')
    expect(flips).toEqual([{ row: 3, col: 3 }])
    const next = applyAction(state, 'black', { type: 'place', row: 2, col: 3 }).state
    expect(next.cells[3 * 8 + 3]).toBe('black')
    expect(next.currentPlayer).toBe('white')
  })

  it('无法夹击时不是合法落子', () => {
    const state = createInitialState()
    const flips = findFlips(state.cells, state.size, 0, 0, 'black')
    expect(flips).toHaveLength(0)
    expect(() => applyAction(state, 'black', { type: 'place', row: 0, col: 0 })).toThrow()
  })

  it('countWinner 按棋子数判定', () => {
    const cells: ReversiCellValue[] = new Array(64).fill('black')
    expect(countWinner(cells)).toBe('black')
    cells[0] = 'white'
    expect(countWinner(cells)).toBe('black')
    const half: ReversiCellValue[] = new Array(32).fill('black').concat(new Array(32).fill('white'))
    expect(countWinner(half)).toBeNull()
  })

  it('满盘时双方均无合法落子', () => {
    const full: ReversiCellValue[] = Array<ReversiCellValue>(64).fill('black')
    expect(getLegalMoves(full, 8, 'white')).toHaveLength(0)
    expect(getLegalMoves(full, 8, 'black')).toHaveLength(0)
  })
})