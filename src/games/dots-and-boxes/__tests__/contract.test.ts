import { describe, expect, it } from 'vitest'
import { DotsAndBoxesGame } from '../domain/DotsAndBoxesGame'
import { dotsAndBoxesStateSchema } from '../domain/schema'
import { selectDotsBoardViewModel, selectResult, selectScores, selectStandings } from '../domain/selectors'

function createGame() {
  return new DotsAndBoxesGame({
    boxSize: 8,
    players: ['red', 'blue'],
    firstPlayer: 'red',
  })
}

describe('方格大战契约', () => {
  const game = createGame()

  it('createInitialState 符合 stateSchema', () => {
    expect(() => dotsAndBoxesStateSchema.parse(game.createInitialState())).not.toThrow()
  })

  it('初始玩家与合法行为正确', () => {
    const state = game.createInitialState()
    expect(game.getCurrentPlayer(state)).toBe('red')
    expect(game.getLegalActions(state, 'red')).toHaveLength(8 * 9 * 2)
    expect(game.getLegalActions(state, 'blue')).toHaveLength(0)
    expect(game.getLegalActions(state, 'green')).toHaveLength(0)
  })

  it('reduce 不修改输入且确定性返回同样结果', () => {
    const state = game.createInitialState()
    const before = JSON.stringify(state)
    const action = { type: 'draw-edge' as const, orientation: 'horizontal' as const, row: 3, col: 4 }
    const a = game.reduce(state, 'red', action)
    const b = game.reduce(state, 'red', action)
    expect(JSON.stringify(state)).toBe(before)
    expect(a).toEqual(b)
  })

  it('isActionLegal 拒绝非当前玩家、越界与已画的边', () => {
    const state = game.createInitialState()
    expect(
      game.isActionLegal(state, 'red', { type: 'draw-edge', orientation: 'horizontal', row: 0, col: 0 }),
    ).toBe(true)
    expect(
      game.isActionLegal(state, 'blue', { type: 'draw-edge', orientation: 'horizontal', row: 0, col: 0 }),
    ).toBe(false)
    expect(
      game.isActionLegal(state, 'red', { type: 'draw-edge', orientation: 'horizontal', row: 0, col: 8 }),
    ).toBe(false)
    expect(
      game.isActionLegal(state, 'red', { type: 'draw-edge', orientation: 'vertical', row: 8, col: 0 }),
    ).toBe(false)

    const next = game.reduce(state, 'red', {
      type: 'draw-edge',
      orientation: 'horizontal',
      row: 0,
      col: 0,
    }).state
    expect(
      game.isActionLegal(next, 'blue', { type: 'draw-edge', orientation: 'horizontal', row: 0, col: 0 }),
    ).toBe(false)
  })

  it('非法玩家与非法连线会抛错', () => {
    const state = game.createInitialState()
    expect(() =>
      game.reduce(state, 'green', { type: 'draw-edge', orientation: 'horizontal', row: 0, col: 0 }),
    ).toThrow()
    expect(() =>
      game.reduce(state, 'blue', { type: 'draw-edge', orientation: 'horizontal', row: 0, col: 0 }),
    ).toThrow()
  })

  it('serialize → restore 深度一致', () => {
    let state = game.createInitialState()
    state = game.reduce(state, 'red', {
      type: 'draw-edge',
      orientation: 'horizontal',
      row: 0,
      col: 0,
    }).state
    state = game.reduce(state, 'blue', {
      type: 'draw-edge',
      orientation: 'vertical',
      row: 0,
      col: 0,
    }).state
    expect(game.restore(game.serialize(state))).toEqual(state)
  })

  it('observe 不包含终局赢家等内部字段', () => {
    const observation = game.observe(game.createInitialState(), 'red')
    expect('winner' in observation).toBe(false)
  })

  it('Selector 的分数、名次与棋盘视图与规则一致', () => {
    const state = game.createInitialState()
    expect(selectScores(state)).toEqual({ red: 0, blue: 0, green: 0, yellow: 0 })
    expect(selectStandings(state)).toEqual([
      { seat: 'red', score: 0, rank: 1 },
      { seat: 'blue', score: 0, rank: 1 },
    ])
    const view = selectDotsBoardViewModel(state)
    expect(view.boxSize).toBe(8)
    expect(view.interactive).toBe(true)
    expect(selectResult(state)).toBeNull()
  })

  it('schema 拒绝不支持的尺寸、错误席位与不匹配的数组长度', () => {
    const state = game.createInitialState()
    expect(dotsAndBoxesStateSchema.safeParse({ ...state, boxSize: 10 }).success).toBe(false)
    expect(
      dotsAndBoxesStateSchema.safeParse({ ...state, players: ['blue', 'red'] }).success,
    ).toBe(false)
    expect(
      dotsAndBoxesStateSchema.safeParse({ ...state, boxes: state.boxes.slice(1) }).success,
    ).toBe(false)
  })
})