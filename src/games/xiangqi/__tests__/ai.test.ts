import { describe, expect, it } from 'vitest'
import { isSameAction } from '@/core/contracts/action'
import { XiangqiHeuristicController } from '../ai/XiangqiHeuristicController'
import { createInitialState, listLegalActions } from '../domain/rules'
import type {
  XiangqiAction,
  XiangqiObservation,
  XiangqiSide,
  XiangqiState,
} from '../domain/types'
import { stateFromPieces } from './fixtures'

function observe(state: XiangqiState): XiangqiObservation {
  return {
    rows: state.rows,
    cols: state.cols,
    cells: state.cells,
    status: state.status,
    currentPlayer: state.currentPlayer,
    lastMove: state.lastMove,
    moveCount: state.moveCount,
    noCapturePlies: state.noCapturePlies,
  }
}

async function decide(state: XiangqiState, side: XiangqiSide): Promise<XiangqiAction> {
  const controller = new XiangqiHeuristicController(side)
  return controller.decide({
    playerId: side,
    observation: observe(state),
    legalActions: listLegalActions(state, side),
    turn: state.moveCount,
    signal: new AbortController().signal,
  })
}

describe('XiangqiHeuristicController', () => {
  it('会吃掉无保护的车', async () => {
    const state = stateFromPieces([
      { row: 9, col: 4, side: 'red', type: 'general' },
      { row: 0, col: 4, side: 'black', type: 'general' },
      { row: 2, col: 4, side: 'black', type: 'advisor' },
      { row: 5, col: 0, side: 'red', type: 'chariot' },
      { row: 5, col: 5, side: 'black', type: 'chariot' },
    ])
    const action = await decide(state, 'red')
    expect(action).toEqual({
      type: 'move',
      from: { row: 5, col: 0 },
      to: { row: 5, col: 5 },
    })
  })

  it('完全确定，且始终返回合法动作', async () => {
    const state = createInitialState()
    const first = await decide(state, 'red')
    const second = await decide(state, 'red')
    expect(second).toEqual(first)
    expect(
      listLegalActions(state, 'red').some((legal) => isSameAction(legal, first)),
    ).toBe(true)
  })

  it('没有合法动作时抛出明确错误', async () => {
    const state = stateFromPieces(
      [
        { row: 9, col: 4, side: 'red', type: 'general' },
        { row: 0, col: 4, side: 'black', type: 'general' },
        { row: 5, col: 4, side: 'red', type: 'horse' },
        { row: 1, col: 3, side: 'red', type: 'soldier' },
        { row: 1, col: 5, side: 'red', type: 'soldier' },
      ],
      'black',
    )
    await expect(decide(state, 'black')).rejects.toThrow('没有可行动作')
  })
})