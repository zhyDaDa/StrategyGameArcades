import { describe, expect, it } from 'vitest'
import { GameSession } from '@/core/session/GameSession'
import { runControllerTurn } from '@/core/session/turn-loop'
import { replayGame } from '@/core/history/replay'
import { RandomController } from '@/controllers/RandomController'
import { XiangqiGame } from '../domain/XiangqiGame'
import { xiangqiStateSchema } from '../domain/schema'
import type {
  XiangqiAction,
  XiangqiEvent,
  XiangqiObservation,
  XiangqiState,
} from '../domain/types'

type Session = GameSession<XiangqiState, XiangqiAction, XiangqiObservation, XiangqiEvent>

const OPENING_MOVE: XiangqiAction = {
  type: 'move',
  from: { row: 6, col: 0 },
  to: { row: 5, col: 0 },
}

describe('中国象棋契约', () => {
  const game = new XiangqiGame()

  it('createInitialState 符合 stateSchema', () => {
    expect(() => xiangqiStateSchema.parse(game.createInitialState())).not.toThrow()
  })

  it('初始玩家与合法行为正确', () => {
    const state = game.createInitialState()
    expect(game.getCurrentPlayer(state)).toBe('red')
    expect(game.getLegalActions(state, 'red')).toHaveLength(44)
    expect(game.getLegalActions(state, 'black')).toHaveLength(0)
  })

  it('reduce 不修改输入且确定性', () => {
    const state = game.createInitialState()
    const before = JSON.stringify(state)
    const a = game.reduce(state, 'red', OPENING_MOVE)
    const b = game.reduce(state, 'red', OPENING_MOVE)
    expect(JSON.stringify(state)).toBe(before)
    expect(a).toEqual(b)
  })

  it('serialize → restore 深度一致', () => {
    const state = game.reduce(game.createInitialState(), 'red', OPENING_MOVE).state
    expect(game.restore(game.serialize(state))).toEqual(state)
  })

  it('observe 不包含终局赢家与终局原因', () => {
    const observation = game.observe(game.createInitialState(), 'red')
    expect('winner' in observation).toBe(false)
    expect('endReason' in observation).toBe(false)
  })

  it('非法玩家或非法走法不改变状态', () => {
    const session = new GameSession(game)
    expect(() =>
      session.dispatch('black', {
        type: 'move',
        from: { row: 3, col: 0 },
        to: { row: 4, col: 0 },
      }),
    ).toThrow()
    expect(session.getSnapshot().version).toBe(0)
    expect(() =>
      session.dispatch('red', {
        type: 'move',
        from: { row: 6, col: 0 },
        to: { row: 4, col: 0 },
      }),
    ).toThrow()
    expect(session.getSnapshot().version).toBe(0)
  })

  it('Random vs Random 可完局且可重放', async () => {
    const session: Session = new GameSession(new XiangqiGame())
    const controllers: Record<string, RandomController<XiangqiObservation, XiangqiAction>> = {
      red: new RandomController('red', 11),
      black: new RandomController('black', 23),
    }
    let guard = 0
    while (session.getSnapshot().result === null && guard < 600) {
      guard += 1
      const player = session.getSnapshot().currentPlayer
      if (player === null) break
      await runControllerTurn(session, controllers[player], new AbortController().signal)
    }
    expect(session.getSnapshot().result).not.toBeNull()
    expect(replayGame(game, session.getHistory())).toEqual(session.getState())
  })
})