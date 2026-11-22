import { describe, expect, it } from 'vitest'
import { isSameAction } from '@/core/contracts/action'
import { ReversiHeuristicController } from '../ai/ReversiHeuristicController'
import { createInitialState, listLegalActions } from '../domain/rules'
import type {
  ReversiAction,
  ReversiCellValue,
  ReversiObservation,
  ReversiSide,
  ReversiState,
} from '../domain/types'

function stateWith(
  currentPlayer: ReversiSide,
  discs: ReadonlyArray<readonly [number, number, ReversiCellValue]>,
): ReversiState {
  const base = createInitialState()
  const cells = base.cells.slice()
  for (const [row, col, value] of discs) {
    cells[row * base.size + col] = value
  }
  return { ...base, cells, currentPlayer, moveCount: discs.length }
}

async function decide(state: ReversiState, side: ReversiSide): Promise<ReversiAction> {
  const controller = new ReversiHeuristicController(side)
  const observation: ReversiObservation = {
    size: state.size,
    cells: state.cells,
    status: state.status,
    currentPlayer: state.currentPlayer,
    lastMove: state.lastMove,
    moveCount: state.moveCount,
  }
  return controller.decide({
    playerId: side,
    observation,
    legalActions: listLegalActions(state, side),
    turn: state.moveCount,
    signal: new AbortController().signal,
  })
}

describe('ReversiHeuristicController', () => {
  it('能占角时优先占角', async () => {
    const state = stateWith('black', [
      [0, 1, 'white'],
      [0, 2, 'black'],
      [3, 3, 'white'],
      [3, 4, 'black'],
      [4, 3, 'black'],
      [4, 4, 'white'],
    ])
    const action = await decide(state, 'black')
    expect(action).toEqual({ type: 'place', row: 0, col: 0 })
  })

  it('完全确定，且始终返回合法动作', async () => {
    const state = createInitialState()
    const first = await decide(state, 'black')
    const second = await decide(state, 'black')
    expect(second).toEqual(first)
    expect(
      listLegalActions(state, 'black').some((legal) => isSameAction(legal, first)),
    ).toBe(true)
  })

  it('没有合法动作时抛出明确错误', async () => {
    const state = stateWith('black', [[0, 0, 'black']])
    await expect(decide(state, 'white')).rejects.toThrow('没有可行动作')
  })
})