import { describe, expect, it } from 'vitest'
import { GomokuGame } from '../domain/GomokuGame'
import { gomokuStateSchema } from '../domain/schema'
import { selectEndReason, selectResult, selectWinningLine } from '../domain/selectors'

describe('五子棋契约', () => {
  const game = new GomokuGame()

  it('createInitialState 符合 stateSchema', () => {
    expect(() => gomokuStateSchema.parse(game.createInitialState())).not.toThrow()
  })

  it('初始玩家与合法行为正确', () => {
    const state = game.createInitialState()
    expect(game.getCurrentPlayer(state)).toBe('black')
    expect(game.getLegalActions(state, 'black')).toHaveLength(15 * 15 + 1)
    expect(game.getLegalActions(state, 'white')).toHaveLength(0)
  })

  it('reduce 不修改输入且确定性返回同样结果', () => {
    const state = game.createInitialState()
    const before = JSON.stringify(state)
    const a = game.reduce(state, 'black', { type: 'place', row: 7, col: 7 })
    const b = game.reduce(state, 'black', { type: 'place', row: 7, col: 7 })
    expect(JSON.stringify(state)).toBe(before)
    expect(a).toEqual(b)
  })

  it('非法玩家 / 非法落子会抛错', () => {
    const state = game.createInitialState()
    expect(() => game.reduce(state, 'white', { type: 'place', row: 7, col: 7 })).toThrow()
    const occupied = game.reduce(state, 'black', { type: 'place', row: 7, col: 7 }).state
    expect(() => game.reduce(occupied, 'white', { type: 'place', row: 7, col: 7 })).toThrow()
  })

  it('serialize → restore 深度一致', () => {
    let state = game.createInitialState()
    state = game.reduce(state, 'black', { type: 'place', row: 7, col: 7 }).state
    state = game.reduce(state, 'white', { type: 'place', row: 0, col: 0 }).state
    expect(game.restore(game.serialize(state))).toEqual(state)
  })

  it('observe 不包含终局赢家等内部字段', () => {
    const state = game.createInitialState()
    const observation = game.observe(state, 'black')
    expect('winner' in observation).toBe(false)
  })

  it('Selector 派生结果与规则一致，终局原因可恢复', () => {
    let state = game.createInitialState()
    state = game.reduce(state, 'black', { type: 'place', row: 7, col: 7 }).state
    state = game.reduce(state, 'white', { type: 'place', row: 0, col: 0 }).state
    expect(selectResult(state)).toBeNull()
    expect(gomokuStateSchema.parse(state).cells.filter((c) => c !== 'empty')).toHaveLength(2)

    let won = game.createInitialState()
    won = game.reduce(won, 'black', { type: 'place', row: 7, col: 7 }).state
    won = game.reduce(won, 'white', { type: 'place', row: 0, col: 0 }).state
    won = game.reduce(won, 'black', { type: 'place', row: 7, col: 8 }).state
    won = game.reduce(won, 'white', { type: 'place', row: 0, col: 1 }).state
    won = game.reduce(won, 'black', { type: 'place', row: 7, col: 9 }).state
    won = game.reduce(won, 'white', { type: 'place', row: 0, col: 2 }).state
    won = game.reduce(won, 'black', { type: 'place', row: 7, col: 10 }).state
    won = game.reduce(won, 'white', { type: 'place', row: 0, col: 3 }).state
    won = game.reduce(won, 'black', { type: 'place', row: 7, col: 11 }).state
    expect(selectResult(won)).toEqual({ outcome: 'win', winner: 'black' })
    expect(selectEndReason(won)).toBe('five')
    expect(selectWinningLine(won)).toHaveLength(5)
    expect(game.restore(game.serialize(won))).toEqual(won)
  })

  it('schema 拒绝非 15×15 的局面', () => {
    const state = game.createInitialState()
    expect(gomokuStateSchema.safeParse({ ...state, size: 14 }).success).toBe(false)
  })
})