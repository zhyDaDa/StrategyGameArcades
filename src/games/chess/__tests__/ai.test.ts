import { describe, expect, it } from 'vitest'
import { isSameAction } from '@/core/contracts/action'
import { ChessHeuristicController } from '../ai/ChessHeuristicController'
import { createInitialState, listLegalActions } from '../domain/rules'
import type {
  ChessAction,
  ChessObservation,
  ChessSide,
  ChessState,
} from '../domain/types'
import { stateFromPieces } from './fixtures'

function observe(state: ChessState): ChessObservation {
  return {
    rows: state.rows,
    cols: state.cols,
    cells: state.cells,
    castling: state.castling,
    enPassantTarget: state.enPassantTarget,
    status: state.status,
    currentPlayer: state.currentPlayer,
    lastMove: state.lastMove,
    moveCount: state.moveCount,
    halfmoveClock: state.halfmoveClock,
  }
}

async function decide(state: ChessState, side: ChessSide): Promise<ChessAction> {
  const controller = new ChessHeuristicController(side)
  return controller.decide({
    playerId: side,
    observation: observe(state),
    legalActions: listLegalActions(state, side),
    turn: state.moveCount,
    signal: new AbortController().signal,
  })
}

describe('ChessHeuristicController', () => {
  it('会吃掉无保护的后', async () => {
    const state = stateFromPieces([
      { row: 7, col: 4, side: 'white', type: 'king' },
      { row: 7, col: 3, side: 'white', type: 'rook' },
      { row: 0, col: 4, side: 'black', type: 'king' },
      { row: 3, col: 3, side: 'black', type: 'queen' },
    ])
    const action = await decide(state, 'white')
    expect(action).toEqual({
      type: 'move',
      from: { row: 7, col: 3 },
      to: { row: 3, col: 3 },
    })
  })

  it('完全确定，且始终返回合法动作', async () => {
    const state = createInitialState()
    const first = await decide(state, 'white')
    const second = await decide(state, 'white')
    expect(second).toEqual(first)
    expect(
      listLegalActions(state, 'white').some((legal) => isSameAction(legal, first)),
    ).toBe(true)
  })

  it('没有合法动作时抛出明确错误', async () => {
    const state = stateFromPieces(
      [
        { row: 0, col: 0, side: 'black', type: 'king' },
        { row: 2, col: 2, side: 'white', type: 'king' },
        { row: 2, col: 1, side: 'white', type: 'queen' },
      ],
      { currentPlayer: 'black' },
    )
    await expect(decide(state, 'black')).rejects.toThrow('没有可行动作')
  })
})