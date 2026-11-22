import { describe, expect, it } from 'vitest'
import { GameSession } from '@/core/session/GameSession'
import { runControllerTurn } from '@/core/session/turn-loop'
import { RandomController } from '@/controllers/RandomController'
import { ChessGame } from '../domain/ChessGame'
import { chessStateSchema } from '../domain/schema'
import type {
  ChessAction,
  ChessEvent,
  ChessObservation,
  ChessState,
} from '../domain/types'
import { stateFromPieces } from './fixtures'

type Session = GameSession<ChessState, ChessAction, ChessObservation, ChessEvent>

const OPENING_MOVE: ChessAction = {
  type: 'move',
  from: { row: 6, col: 4 },
  to: { row: 4, col: 4 },
}

describe('国际象棋契约', () => {
  const game = new ChessGame()

  it('createInitialState 符合 stateSchema', () => {
    expect(() => chessStateSchema.parse(game.createInitialState())).not.toThrow()
  })

  it('初始玩家与合法行为正确', () => {
    const state = game.createInitialState()
    expect(game.getCurrentPlayer(state)).toBe('white')
    expect(game.getLegalActions(state, 'white')).toHaveLength(20)
    expect(game.getLegalActions(state, 'black')).toHaveLength(0)
  })

  it('reduce 不修改输入且确定性', () => {
    const state = game.createInitialState()
    const before = JSON.stringify(state)
    const a = game.reduce(state, 'white', OPENING_MOVE)
    const b = game.reduce(state, 'white', OPENING_MOVE)
    expect(JSON.stringify(state)).toBe(before)
    expect(a).toEqual(b)
  })

  it('serialize → restore 深度一致', () => {
    const state = game.reduce(game.createInitialState(), 'white', OPENING_MOVE).state
    expect(game.restore(game.serialize(state))).toEqual(state)
  })

  it('observe 不包含终局赢家与终局原因', () => {
    const observation = game.observe(game.createInitialState(), 'white')
    expect('winner' in observation).toBe(false)
    expect('endReason' in observation).toBe(false)
  })

  it('非法玩家或非法走法不改变状态', () => {
    const session = new GameSession(game)
    expect(() =>
      session.dispatch('black', {
        type: 'move',
        from: { row: 1, col: 4 },
        to: { row: 3, col: 4 },
      }),
    ).toThrow()
    expect(session.getSnapshot().version).toBe(0)
    expect(() =>
      session.dispatch('white', {
        type: 'move',
        from: { row: 6, col: 4 },
        to: { row: 3, col: 4 },
      }),
    ).toThrow()
    expect(session.getSnapshot().version).toBe(0)
  })

  it('Random vs Random 可完局且可重放', async () => {
    const initialState = stateFromPieces([
      { row: 7, col: 4, side: 'white', type: 'king' },
      { row: 7, col: 3, side: 'white', type: 'queen' },
      { row: 0, col: 4, side: 'black', type: 'king' },
    ])
    const session: Session = new GameSession(game, { initialState })
    const controllers: Record<string, RandomController<ChessObservation, ChessAction>> = {
      white: new RandomController('white', 11),
      black: new RandomController('black', 23),
    }
    let guard = 0
    while (session.getSnapshot().result === null && guard < 400) {
      guard += 1
      const player = session.getSnapshot().currentPlayer
      if (player === null) break
      await runControllerTurn(session, controllers[player], new AbortController().signal)
    }
    expect(session.getSnapshot().result).not.toBeNull()

    let replayed: ChessState = initialState
    for (const record of session.getHistory()) {
      replayed = game.reduce(replayed, record.playerId, record.action).state
    }
    expect(replayed).toEqual(session.getState())
  })
})