import { describe, expect, it } from 'vitest'
import { replayGame } from '@/core/history/replay'
import { GameSession } from '@/core/session/GameSession'
import { runControllerTurn } from '@/core/session/turn-loop'
import { RandomController } from '@/controllers/RandomController'
import { NestedTicTacToeGame } from '../domain/NestedTicTacToeGame'
import { applyAction } from '../domain/rules'
import { nestedTicTacToeStateSchema } from '../domain/schema'
import {
  selectEndReason,
  selectMacroOutcome,
  selectMicroBoardResults,
  selectNestedTicTacToeBoardViewModel,
} from '../domain/selectors'
import type {
  NestedTicTacToeAction,
  NestedTicTacToeEvent,
  NestedTicTacToeObservation,
  NestedTicTacToeState,
} from '../domain/types'

type Session = GameSession<
  NestedTicTacToeState,
  NestedTicTacToeAction,
  NestedTicTacToeObservation,
  NestedTicTacToeEvent
>

describe('九宫井字棋契约', () => {
  const game = new NestedTicTacToeGame()

  it('createInitialState 符合 stateSchema', () => {
    expect(() => nestedTicTacToeStateSchema.parse(game.createInitialState())).not.toThrow()
  })

  it('stateSchema 拒绝错误的棋盘长度', () => {
    const state = game.createInitialState()
    expect(() =>
      nestedTicTacToeStateSchema.parse({ ...state, cells: state.cells.slice(0, 80) }),
    ).toThrow()
  })

  it('初始玩家与合法行为正确', () => {
    const state = game.createInitialState()
    expect(game.getCurrentPlayer(state)).toBe('red')
    expect(game.getLegalActions(state, 'red')).toHaveLength(81)
    expect(game.getLegalActions(state, 'blue')).toHaveLength(0)
  })

  it('isActionLegal 覆盖回合、空格、强制宫与封盘', () => {
    const initial = game.createInitialState()
    expect(game.isActionLegal(initial, 'blue', { type: 'place', row: 0, col: 0 })).toBe(false)
    expect(game.isActionLegal(initial, 'red', { type: 'place', row: 0, col: 0 })).toBe(true)

    const afterFirst = applyAction(initial, 'red', { type: 'place', row: 0, col: 0 }).state
    expect(game.isActionLegal(afterFirst, 'blue', { type: 'place', row: 4, col: 4 })).toBe(false)
    expect(game.isActionLegal(afterFirst, 'blue', { type: 'place', row: 0, col: 0 })).toBe(false)
    expect(game.isActionLegal(afterFirst, 'blue', { type: 'place', row: 0, col: 1 })).toBe(true)
  })

  it('reduce 不修改输入且确定性', () => {
    const state = game.createInitialState()
    const before = JSON.stringify(state)
    const a = game.reduce(state, 'red', { type: 'place', row: 4, col: 4 })
    const b = game.reduce(state, 'red', { type: 'place', row: 4, col: 4 })
    expect(JSON.stringify(state)).toBe(before)
    expect(a).toEqual(b)
  })

  it('serialize → restore 深度一致', () => {
    const state = applyAction(game.createInitialState(), 'red', {
      type: 'place',
      row: 4,
      col: 4,
    }).state
    expect(game.restore(game.serialize(state))).toEqual(state)
  })

  it('observe 不包含终局赢家', () => {
    const observation = game.observe(game.createInitialState(), 'red')
    expect('winner' in observation).toBe(false)
  })

  it('Selector 与规则一致', () => {
    let state = game.createInitialState()
    state = applyAction(state, 'red', { type: 'place', row: 0, col: 1 }).state
    state = applyAction(state, 'blue', { type: 'place', row: 0, col: 3 }).state
    state = applyAction(state, 'red', { type: 'place', row: 0, col: 2 }).state
    state = applyAction(state, 'blue', { type: 'place', row: 0, col: 6 }).state
    state = applyAction(state, 'red', { type: 'place', row: 0, col: 0 }).state

    expect(selectMicroBoardResults(state)[0]).toBe('red')
    expect(selectMacroOutcome(state).winner).toBeNull()
    expect(selectEndReason(state)).toBeNull()

    const vm = selectNestedTicTacToeBoardViewModel(state)
    expect(vm.forcedBoard).toBeNull()
    expect(vm.legalCells.filter(Boolean)).toHaveLength(70)
    expect(vm.interactive).toBe(true)
  })

  it('Random vs Random 可完局且可重放', async () => {
    const session = new GameSession(new NestedTicTacToeGame()) as Session
    const controllers = {
      red: new RandomController<NestedTicTacToeObservation, NestedTicTacToeAction>('red', 5),
      blue: new RandomController<NestedTicTacToeObservation, NestedTicTacToeAction>('blue', 6),
    }
    let guard = 0
    while (session.getSnapshot().result === null && guard < 200) {
      guard += 1
      const player = session.getSnapshot().currentPlayer
      if (player !== 'red' && player !== 'blue') {
        break
      }
      await runControllerTurn(session, controllers[player], new AbortController().signal)
    }

    expect(session.getSnapshot().result).not.toBeNull()
    expect(replayGame(game, session.getHistory())).toEqual(session.getState())
  })
})