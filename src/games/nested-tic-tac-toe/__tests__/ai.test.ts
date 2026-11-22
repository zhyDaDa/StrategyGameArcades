import { describe, expect, it } from 'vitest'
import type { DecideContext } from '@/core/contracts/player'
import { NestedTicTacToeHeuristicController } from '../ai/NestedTicTacToeHeuristicController'
import { NestedTicTacToeGame } from '../domain/NestedTicTacToeGame'
import { applyAction, indexOf, innerCellIndex, opponentOf } from '../domain/rules'
import type {
  NestedTicTacToeAction,
  NestedTicTacToeCellValue,
  NestedTicTacToeObservation,
  NestedTicTacToeSide,
  NestedTicTacToeState,
} from '../domain/types'

const DRAW_BOARD: readonly NestedTicTacToeCellValue[] = [
  'red', 'blue', 'red',
  'red', 'blue', 'blue',
  'blue', 'red', 'red',
]

const game = new NestedTicTacToeGame()

function emptyCells(): NestedTicTacToeCellValue[] {
  return Array<NestedTicTacToeCellValue>(81).fill('empty')
}

function setBoard(
  cells: NestedTicTacToeCellValue[],
  board: number,
  values: readonly NestedTicTacToeCellValue[],
): void {
  values.forEach((value, inner) => {
    cells[innerCellIndex(board, inner)] = value
  })
}

function makeState(
  cells: readonly NestedTicTacToeCellValue[],
  overrides: Partial<Omit<NestedTicTacToeState, 'cells'>> = {},
): NestedTicTacToeState {
  return {
    cells,
    currentPlayer: 'red',
    lastMove: null,
    status: 'playing',
    winner: null,
    moveCount: 0,
    ...overrides,
  }
}

function decideContext(
  state: NestedTicTacToeState,
  side: NestedTicTacToeSide,
  turn = 0,
): DecideContext<NestedTicTacToeObservation, NestedTicTacToeAction> {
  return {
    playerId: side,
    observation: game.observe(state, side),
    legalActions: game.getLegalActions(state, side),
    turn,
    signal: new AbortController().signal,
  }
}

describe('九宫井字棋 AI', () => {
  it('初始局面返回合法动作且确定', async () => {
    const state = game.createInitialState()
    const controller = new NestedTicTacToeHeuristicController('red')
    const first = await controller.decide(decideContext(state, 'red'))
    const second = await controller.decide(decideContext(state, 'red'))

    expect(first).toEqual(second)
    expect(game.isActionLegal(state, 'red', first)).toBe(true)
  })

  it('抓住立即完成大棋盘三连的走法', async () => {
    const cells = emptyCells()
    setBoard(cells, 0, ['red', 'red', 'red', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    setBoard(cells, 1, ['red', 'red', 'red', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    setBoard(cells, 2, ['red', 'red', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    cells[indexOf(6, 8)] = 'blue'
    const state = makeState(cells, {
      currentPlayer: 'red',
      lastMove: { row: 6, col: 8 },
      moveCount: 9,
    })

    const controller = new NestedTicTacToeHeuristicController('red')
    const action = await controller.decide(decideContext(state, 'red'))

    expect(action).toEqual({ type: 'place', row: 0, col: 8 })
  })

  it('阻挡对手一步完成大棋盘三连的走法', async () => {
    const cells = emptyCells()
    setBoard(cells, 3, ['blue', 'blue', 'blue', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    setBoard(cells, 4, ['blue', 'blue', 'blue', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    setBoard(cells, 5, ['empty', 'blue', 'blue', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    cells[indexOf(1, 2)] = 'blue'
    const state = makeState(cells, {
      currentPlayer: 'red',
      lastMove: { row: 1, col: 2 },
      moveCount: 9,
    })

    const controller = new NestedTicTacToeHeuristicController('red')
    const action = await controller.decide(decideContext(state, 'red'))

    expect(action).toEqual({ type: 'place', row: 3, col: 6 })
  })

  it('没有立即胜负时优先占领小棋盘', async () => {
    const cells = emptyCells()
    setBoard(cells, 0, ['empty', 'red', 'red', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    const state = makeState(cells, { currentPlayer: 'red', moveCount: 2 })

    const controller = new NestedTicTacToeHeuristicController('red')
    const action = await controller.decide(decideContext(state, 'red'))

    expect(action).toEqual({ type: 'place', row: 0, col: 0 })
  })

  it('被送入已封盘宫时在自由落子中返回合法动作', async () => {
    const cells = emptyCells()
    setBoard(cells, 0, DRAW_BOARD)
    setBoard(cells, 1, ['blue', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    const state = makeState(cells, {
      currentPlayer: 'red',
      lastMove: { row: 0, col: 3 },
      moveCount: 10,
    })

    const controller = new NestedTicTacToeHeuristicController('red')
    const action = await controller.decide(decideContext(state, 'red'))

    expect(game.isActionLegal(state, 'red', action)).toBe(true)
  })

  it('启发式 AI vs 启发式 AI 可终局，且每步合法', async () => {
    let state = game.createInitialState()
    let side: NestedTicTacToeSide = 'red'
    let moves = 0

    while (state.status === 'playing' && moves < 81) {
      const before = JSON.stringify(state)
      const controller = new NestedTicTacToeHeuristicController(side)
      const action = await controller.decide(decideContext(state, side, moves))

      expect(game.isActionLegal(state, side, action)).toBe(true)
      expect(JSON.stringify(state)).toBe(before)

      state = applyAction(state, side, action).state
      side = opponentOf(side)
      moves += 1
    }

    expect(state.status).toBe('completed')
    expect(moves).toBeLessThanOrEqual(81)
  })
})