import { describe, expect, it } from 'vitest'
import { GameSession } from '@/core/session/GameSession'
import { runControllerTurn } from '@/core/session/turn-loop'
import { replayGame } from '@/core/history/replay'
import { RandomController } from '@/controllers/RandomController'
import { ReversiGame } from '../domain/ReversiGame'
import { reversiStateSchema } from '../domain/schema'
import type { ReversiAction, ReversiEvent, ReversiObservation, ReversiState } from '../domain/types'

type Session = GameSession<ReversiState, ReversiAction, ReversiObservation, ReversiEvent>

describe('黑白棋契约', () => {
  const game = new ReversiGame()

  it('createInitialState 符合 stateSchema', () => {
    expect(() => reversiStateSchema.parse(game.createInitialState())).not.toThrow()
  })

  it('初始玩家与合法行为正确', () => {
    const state = game.createInitialState()
    expect(game.getCurrentPlayer(state)).toBe('black')
    expect(game.getLegalActions(state, 'black')).toHaveLength(4)
    expect(game.getLegalActions(state, 'white')).toHaveLength(0)
  })

  it('reduce 不修改输入且确定性', () => {
    const state = game.createInitialState()
    const before = JSON.stringify(state)
    const a = game.reduce(state, 'black', { type: 'place', row: 2, col: 3 })
    const b = game.reduce(state, 'black', { type: 'place', row: 2, col: 3 })
    expect(JSON.stringify(state)).toBe(before)
    expect(a).toEqual(b)
  })

  it('serialize → restore 深度一致', () => {
    let state = game.createInitialState()
    state = game.reduce(state, 'black', { type: 'place', row: 2, col: 3 }).state
    expect(game.restore(game.serialize(state))).toEqual(state)
  })

  it('observe 不包含终局赢家', () => {
    const observation = game.observe(game.createInitialState(), 'black')
    expect('winner' in observation).toBe(false)
  })

  it('Random vs Random 可完局且可重放', async () => {
    const session = new GameSession(new ReversiGame())
    const controllers: Record<string, RandomController<ReversiObservation, ReversiAction>> = {
      black: new RandomController('black', 5),
      white: new RandomController('white', 6),
    }
    let guard = 0
    while (session.getSnapshot().result === null && guard < 200) {
      guard += 1
      const player = session.getSnapshot().currentPlayer
      if (player === null) break
      await runControllerTurn(session, controllers[player], new AbortController().signal)
    }
    expect(session.getSnapshot().result).not.toBeNull()
    expect(replayGame(game, session.getHistory())).toEqual(session.getState())
  })
})