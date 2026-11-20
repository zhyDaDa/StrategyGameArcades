import { describe, expect, it } from 'vitest'
import {
  applyAction,
  createInitialState,
  findWinningLine,
  listLegalActions,
  wouldWinAt,
} from '../domain/rules'
import { selectWinningLine } from '../domain/selectors'
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
    expect(state.endReason).toBe('five')
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
    expect(state.endReason).toBe('five')
  })

  it('认输后对手获胜，且不会误判出胜利连线', () => {
    const state = play([
      ['black', { type: 'place', row: 7, col: 7 }],
      ['white', { type: 'resign' }],
    ])
    expect(state.status).toBe('completed')
    expect(state.winner).toBe('black')
    expect(state.endReason).toBe('resign')
    expect(selectWinningLine(state)).toEqual([])
  })

  it('棋盘填满且无五连时判平局', () => {
    const base = createInitialState()
    // color = floor(row/2) + col 的奇偶：横/竖/两条斜线都不会出现连续 5 子
    const cells = base.cells.map((_, index) => {
      const row = Math.floor(index / base.size)
      const col = index % base.size
      if (row === 14 && col === 13) {
        return 'empty' as const
      }
      return (Math.floor(row / 2) + col) % 2 === 0 ? 'black' : 'white'
    })
    const state: GomokuState = {
      ...base,
      cells,
      currentPlayer: 'black',
      moveCount: 224,
    }

    const transition = applyAction(state, 'black', { type: 'place', row: 14, col: 13 })
    expect(transition.state.status).toBe('completed')
    expect(transition.state.winner).toBeNull()
    expect(transition.state.endReason).toBe('board-full')
    expect(transition.events).toEqual([
      { type: 'piece.placed', playerId: 'black', row: 14, col: 13 },
      { type: 'game.finished', result: { outcome: 'draw' }, reason: 'board-full' },
    ])
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

  it('wouldWinAt 判断候选落点，不修改棋盘', () => {
    const state = play([
      ['black', { type: 'place', row: 7, col: 7 }],
      ['white', { type: 'place', row: 0, col: 0 }],
      ['black', { type: 'place', row: 7, col: 8 }],
      ['white', { type: 'place', row: 0, col: 1 }],
      ['black', { type: 'place', row: 7, col: 9 }],
      ['white', { type: 'place', row: 0, col: 2 }],
      ['black', { type: 'place', row: 7, col: 10 }],
      ['white', { type: 'place', row: 0, col: 3 }],
    ])
    const before = state.cells
    expect(wouldWinAt(state.cells, state.size, 7, 11, 'black')).toBe(true)
    expect(wouldWinAt(state.cells, state.size, 7, 11, 'white')).toBe(false)
    expect(wouldWinAt(state.cells, state.size, 7, 7, 'black')).toBe(false)
    expect(state.cells).toBe(before)
  })

  it('初始合法动作 = 全部空格 + 认输', () => {
    const state = createInitialState()
    const actions = listLegalActions(state, 'black')
    expect(actions).toHaveLength(15 * 15 + 1)
  })
})