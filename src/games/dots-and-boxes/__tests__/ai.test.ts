import { describe, expect, it } from 'vitest'
import { DotsAndBoxesGame } from '../domain/DotsAndBoxesGame'
import { DotsAndBoxesRandomController } from '../ai/DotsAndBoxesRandomController'
import type { DotsAndBoxesAction, DotsAndBoxesSeat, DotsAndBoxesState } from '../domain/types'

const game = new DotsAndBoxesGame({
  boxSize: 8,
  players: ['red', 'blue'],
  firstPlayer: 'red',
})

function play(
  moves: ReadonlyArray<readonly [DotsAndBoxesSeat, DotsAndBoxesAction]>,
): DotsAndBoxesState {
  let state = game.createInitialState()
  for (const [seat, action] of moves) {
    state = game.reduce(state, seat, action).state
  }
  return state
}

async function decide(state: DotsAndBoxesState, playerId: DotsAndBoxesSeat): Promise<DotsAndBoxesAction> {
  const controller = new DotsAndBoxesRandomController(playerId)
  return controller.decide({
    playerId,
    observation: game.observe(state, playerId),
    legalActions: game.getLegalActions(state, playerId),
    turn: state.moveCount,
    signal: new AbortController().signal,
  })
}

describe('方格大战 AI', () => {
  it('能围成方格时优先围格', async () => {
    const state = play([
      ['red', { type: 'draw-edge', orientation: 'horizontal', row: 0, col: 0 }],
      ['blue', { type: 'draw-edge', orientation: 'vertical', row: 0, col: 0 }],
      ['red', { type: 'draw-edge', orientation: 'vertical', row: 0, col: 1 }],
    ])
    expect(state.currentPlayer).toBe('blue')
    await expect(decide(state, 'blue')).resolves.toEqual({
      type: 'draw-edge',
      orientation: 'horizontal',
      row: 1,
      col: 0,
    })
  })

  it('没有可围方格时也总会返回合法动作', async () => {
    const state = game.createInitialState()
    const action = await decide(state, 'red')
    expect(game.getLegalActions(state, 'red')).toContainEqual(action)
    expect(game.isActionLegal(state, 'red', action)).toBe(true)
  })
})