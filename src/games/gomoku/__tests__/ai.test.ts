import { describe, expect, it } from 'vitest'
import { isSameAction } from '@/core/contracts/action'
import { GomokuHeuristicController } from '../ai/GomokuHeuristicController'
import { applyAction, createInitialState, listLegalActions } from '../domain/rules'
import type { GomokuAction, GomokuObservation, GomokuSide, GomokuState } from '../domain/types'

function stateWith(
  currentPlayer: GomokuSide,
  stones: ReadonlyArray<readonly [number, number, GomokuSide]>,
): GomokuState {
  const base = createInitialState()
  const cells = base.cells.slice()
  for (const [row, col, value] of stones) {
    cells[row * base.size + col] = value
  }
  return { ...base, cells, currentPlayer, moveCount: stones.length }
}

async function decide(state: GomokuState, side: GomokuSide): Promise<GomokuAction> {
  const controller = new GomokuHeuristicController(side)
  const observation: GomokuObservation = {
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

function placeOf(action: GomokuAction): { row: number; col: number } {
  if (action.type !== 'place') {
    throw new Error('AI 在有空格时不应认输')
  }
  return { row: action.row, col: action.col }
}

describe('GomokuHeuristicController', () => {
  it('有立即取胜的点时直接取胜', async () => {
    const state = stateWith('black', [
      [7, 7, 'black'],
      [7, 8, 'black'],
      [7, 9, 'black'],
      [7, 10, 'black'],
    ])
    const action = await decide(state, 'black')
    const placed = applyAction(state, 'black', action).state
    expect(placed.winner).toBe('black')
    expect(placed.endReason).toBe('five')
  })

  it('没有胜点时必须堵对方连五', async () => {
    const state = stateWith('black', [
      [7, 7, 'white'],
      [7, 8, 'white'],
      [7, 9, 'white'],
      [7, 10, 'white'],
    ])
    const action = await decide(state, 'black')
    expect([
      { row: 7, col: 6 },
      { row: 7, col: 11 },
    ]).toContainEqual(placeOf(action))
  })

  it('空盘选择中心点', async () => {
    const state = stateWith('black', [])
    expect(placeOf(await decide(state, 'black'))).toEqual({ row: 7, col: 7 })
  })

  it('完全确定，且始终返回合法动作', async () => {
    const state = stateWith('black', [
      [7, 7, 'black'],
      [8, 8, 'white'],
      [7, 8, 'black'],
    ])
    const first = await decide(state, 'black')
    const second = await decide(state, 'black')
    expect(second).toEqual(first)
    expect(
      listLegalActions(state, 'black').some((legal) => isSameAction(legal, first)),
    ).toBe(true)
  })
})