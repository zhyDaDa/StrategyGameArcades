import { describe, expect, it } from 'vitest'
import { applyAction, createInitialState, findWinningLine, listLegalActions } from '../domain/rules'
import type { GomokuAction, GomokuSide, GomokuState } from '../domain/types'

function play(moves: ReadonlyArray<readonly [GomokuSide, GomokuAction]>): GomokuState {
  let state = createInitialState()
  for (const [side, action] of moves) {
    state = applyAction(state, side, action).state
  }
  return state
}

describe('五子棋规则', () => {
  it('黑方横向连成五子获胜', () => {
    const state = play([
      ['black', { type: 'place', row: 7, col: 7 }],
      ['white', { type: 'place', row: 0, col: 0 }],
      ['black', { type: 'place', row: 7, col: 8 }],
      ['white', { type: 'place', row: 0, col: 1 }],
      ['black', { type: 'place', row: 7, col: 9 }],
      ['white', { type: 'place', row: 0, col: 2 }],
      ['black', { type: 'place', row: 7, col: 10 }],
      ['white', { type: 'place', row: 0, col: 3 }],
      ['black', { type: 'place', row: 7, col: 11 }],
    ])
    expect(state.status).toBe('completed')
    expect(state.winner).toBe('black')
  })

  it('斜向连成五子获胜', () => {
    const state = play([
      ['black', { type: 'place', row: 3, col: 3 }],
      ['white', { type: 'place', row: 0, col: 0 }],
      ['black', { type: 'place', row: 4, col: 4 }],
      ['white', { type: 'place', row: 0, col: 1 }],
      ['black', { type: 'place', row: 5, col: 5 }],
      ['white', { type: 'place', row: 0, col: 2 }],
      ['black', { type: 'place', row: 6, col: 6 }],
      ['white', { type: 'place', row: 0, col: 3 }],
      ['black', { type: 'place', row: 7, col: 7 }],
    ])
    expect(state.winner).toBe('black')
  })

  it('认输后对手获胜', () => {
    const state = play([
      ['black', { type: 'place', row: 7, col: 7 }],
      ['white', { type: 'resign' }],
    ])
    expect(state.status).toBe('completed')
    expect(state.winner).toBe('black')
  })

  it('findWinningLine 返回正确连线', () => {
    const state = play([
      ['black', { type: 'place', row: 7, col: 7 }],
      ['white', { type: 'place', row: 0, col: 0 }],
      ['black', { type: 'place', row: 7, col: 8 }],
      ['white', { type: 'place', row: 0, col: 1 }],
      ['black', { type: 'place', row: 7, col: 9 }],
    ])
    const line = findWinningLine(state.cells, state.size, { row: 7, col: 9 }, 'black')
    expect(line).not.toBeNull()
    expect(line?.length).toBe(3)
  })

  it('初始合法动作 = 全部空格 + 认输', () => {
    const state = createInitialState()
    const actions = listLegalActions(state, 'black')
    expect(actions).toHaveLength(15 * 15 + 1)
  })
})