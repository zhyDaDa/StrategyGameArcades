import { describe, expect, it } from 'vitest'
import { replayGame } from '@/core/history/replay'
import { GameSession } from '@/core/session/GameSession'
import { runControllerTurn } from '@/core/session/turn-loop'
import { RandomController } from '@/controllers/RandomController'
import { GoGame } from '../domain/GoGame'
import { goStateSchema } from '../domain/schema'
import type { GoAction, GoObservation } from '../domain/types'

describe('围棋契约', () => {
  const game = new GoGame()

  it('createInitialState 符合 stateSchema', () => {
    expect(() => goStateSchema.parse(game.createInitialState())).not.toThrow()
  })

  it('初始玩家与合法行为正确', () => {
    const state = game.createInitialState()
    expect(game.getCurrentPlayer(state)).toBe('black')
    expect(game.getLegalActions(state, 'black')).toHaveLength(19 * 19 + 2)
    expect(game.getLegalActions(state, 'white')).toHaveLength(0)
  })

  it('reduce 不修改输入且确定性返回同样结果', () => {
    const state = game.createInitialState()
    const before = JSON.stringify(state)
    const a = game.reduce(state, 'black', { type: 'place', row: 9, col: 9 })
    const b = game.reduce(state, 'black', { type: 'place', row: 9, col: 9 })
    expect(JSON.stringify(state)).toBe(before)
    expect(a).toEqual(b)
  })

  it('非法玩家 / 占用点会抛错', () => {
    const state = game.createInitialState()
    expect(() => game.reduce(state, 'white', { type: 'place', row: 9, col: 9 })).toThrow()
    const occupied = game.reduce(state, 'black', { type: 'place', row: 9, col: 9 }).state
    expect(() => game.reduce(occupied, 'white', { type: 'place', row: 9, col: 9 })).toThrow()
  })

  it('serialize → restore 深度一致', () => {
    let state = game.createInitialState()
    state = game.reduce(state, 'black', { type: 'place', row: 9, col: 9 }).state
    state = game.reduce(state, 'white', { type: 'place', row: 3, col: 3 }).state
    state = game.reduce(state, 'black', { type: 'pass' }).state
    expect(game.restore(game.serialize(state))).toEqual(state)
  })

  it('observe 不包含终局赢家与数子结果', () => {
    const observation = game.observe(game.createInitialState(), 'black')
    expect('winner' in observation).toBe(false)
    expect('score' in observation).toBe(false)
    expect('captured' in observation).toBe(false)
  })

  it('连续停一手正常完局，且可重放', () => {
    const session = new GameSession(new GoGame())
    session.dispatch('black', { type: 'pass' })
    session.dispatch('white', { type: 'pass' })

    expect(session.getSnapshot().result).toEqual({ outcome: 'win', winner: 'white' })
    expect(replayGame(game, session.getHistory())).toEqual(session.getState())
  })

  it('Random vs Random 可运行且可重放', async () => {
    const session = new GameSession(new GoGame())
    const controllers: Record<string, RandomController<GoObservation, GoAction>> = {
      black: new RandomController('black', 11),
      white: new RandomController('white', 12),
    }
    let guard = 0
    while (session.getSnapshot().result === null && guard < 60) {
      guard += 1
      const player = session.getSnapshot().currentPlayer
      if (player === null) break
      await runControllerTurn(session, controllers[player], new AbortController().signal)
    }
    expect(session.getHistory().length).toBeGreaterThan(0)
    expect(replayGame(game, session.getHistory())).toEqual(session.getState())
  })

  it('schema 拒绝非 19×19 的局面', () => {
    const state = game.createInitialState()
    expect(goStateSchema.safeParse({ ...state, size: 18 }).success).toBe(false)
    expect(
      goStateSchema.safeParse({ ...state, cells: state.cells.slice(1) }).success,
    ).toBe(false)
  })
})