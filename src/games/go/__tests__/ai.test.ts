import { describe, expect, it } from 'vitest'
import { isSameAction } from '@/core/contracts/action'
import { GoHeuristicController } from '../ai/GoHeuristicController'
import { createInitialState, listLegalActions } from '../domain/rules'
import type {
  GoAction,
  GoCellValue,
  GoObservation,
  GoSide,
  GoState,
} from '../domain/types'

function stateWith(
  currentPlayer: GoSide,
  stones: ReadonlyArray<readonly [number, number, GoCellValue]>,
): GoState {
  const base = createInitialState()
  const cells = base.cells.slice()
  for (const [row, col, value] of stones) {
    cells[row * base.size + col] = value
  }
  return { ...base, cells, currentPlayer, moveCount: stones.length }
}

function observationOf(state: GoState): GoObservation {
  return {
    size: state.size,
    cells: state.cells,
    status: state.status,
    currentPlayer: state.currentPlayer,
    lastMove: state.lastMove,
    koPoint: state.koPoint,
    consecutivePasses: state.consecutivePasses,
    moveCount: state.moveCount,
  }
}

async function decide(
  state: GoState,
  side: GoSide,
  legalActions: readonly GoAction[] = listLegalActions(state, side),
): Promise<GoAction> {
  const controller = new GoHeuristicController(side)
  return controller.decide({
    playerId: side,
    observation: observationOf(state),
    legalActions,
    turn: state.moveCount,
    signal: new AbortController().signal,
  })
}

describe('GoHeuristicController', () => {
  it('空盘时占天元', async () => {
    const state = createInitialState()
    expect(await decide(state, 'black')).toEqual({ type: 'place', row: 9, col: 9 })
  })

  it('能提子时优先提子', async () => {
    const state = stateWith('black', [
      [0, 0, 'white'],
      [0, 1, 'black'],
    ])
    expect(await decide(state, 'black')).toEqual({ type: 'place', row: 1, col: 0 })
  })

  it('不会随手填自己的眼', async () => {
    const state = stateWith('black', [
      [0, 1, 'black'],
      [1, 0, 'black'],
      [1, 1, 'black'],
    ])
    const action = await decide(state, 'black')
    expect(action).not.toEqual({ type: 'place', row: 0, col: 0 })
  })

  it('完全确定，且始终返回合法动作', async () => {
    const state = stateWith('black', [
      [9, 9, 'black'],
      [10, 10, 'white'],
      [8, 9, 'black'],
    ])
    const first = await decide(state, 'black')
    const second = await decide(state, 'black')
    expect(second).toEqual(first)
    expect(
      listLegalActions(state, 'black').some((legal) => isSameAction(legal, first)),
    ).toBe(true)
  })

  it('没有落点可选时停一手', async () => {
    const state = createInitialState()
    expect(await decide(state, 'black', [{ type: 'pass' }])).toEqual({ type: 'pass' })
  })
})