import { describe, expect, it } from 'vitest'
import { selectResult, selectScore } from '../domain/selectors'
import {
  applyAction,
  collectGroup,
  createInitialState,
  getLegalMoves,
  isLegalPlacement,
  scoreBoard,
} from '../domain/rules'
import {
  GO_BOARD_SIZE,
  type GoCellValue,
  type GoSide,
  type GoState,
} from '../domain/types'

const SIZE = GO_BOARD_SIZE

function stateWith(
  currentPlayer: GoSide,
  stones: ReadonlyArray<readonly [number, number, GoCellValue]>,
): GoState {
  const base = createInitialState()
  const cells = base.cells.slice()
  for (const [row, col, value] of stones) {
    cells[row * SIZE + col] = value
  }
  return { ...base, cells, currentPlayer, moveCount: stones.length }
}

function at(row: number, col: number): number {
  return row * SIZE + col
}

describe('围棋规则', () => {
  it('初始局面：19×19 空盘、黑先', () => {
    const state = createInitialState()
    expect(state.cells).toHaveLength(SIZE * SIZE)
    expect(state.cells.every((cell) => cell === 'empty')).toBe(true)
    expect(state.currentPlayer).toBe('black')
    expect(state.koPoint).toBeNull()
    expect(getLegalMoves(state.cells, SIZE, 'black', null)).toHaveLength(SIZE * SIZE)
  })

  it('单子无气会被提掉，并记入提子数', () => {
    const state = stateWith('black', [
      [0, 0, 'white'],
      [0, 1, 'black'],
    ])
    const transition = applyAction(state, 'black', { type: 'place', row: 1, col: 0 })
    const next = transition.state

    expect(next.cells[at(0, 0)]).toBe('empty')
    expect(next.lastCaptured).toEqual([{ row: 0, col: 0 }])
    expect(next.captured).toEqual({ black: 1, white: 0 })
    expect(next.currentPlayer).toBe('white')
    expect(transition.events[0]).toEqual({
      type: 'stone.placed',
      playerId: 'black',
      row: 1,
      col: 0,
      captured: [{ row: 0, col: 0 }],
    })
  })

  it('整块被提时全部移除', () => {
    const state = stateWith('black', [
      [0, 0, 'white'],
      [0, 1, 'white'],
      [0, 2, 'black'],
      [1, 0, 'black'],
    ])
    const next = applyAction(state, 'black', { type: 'place', row: 1, col: 1 }).state
    expect(next.cells[at(0, 0)]).toBe('empty')
    expect(next.cells[at(0, 1)]).toBe('empty')
    expect(next.captured.black).toBe(2)
  })

  it('自杀点不合法，也不会出现在合法落子中', () => {
    const state = stateWith('white', [
      [0, 1, 'black'],
      [1, 0, 'black'],
    ])
    expect(isLegalPlacement(state.cells, SIZE, 0, 0, 'white', null)).toBe(false)
    expect(
      getLegalMoves(state.cells, SIZE, 'white', null).some(
        (move) => move.row === 0 && move.col === 0,
      ),
    ).toBe(false)
    expect(() => applyAction(state, 'white', { type: 'place', row: 0, col: 0 })).toThrow(
      '自杀',
    )
  })

  it('简单劫：不能立即回提，停一手或他处落子后解除', () => {
    const state = stateWith('black', [
      [1, 1, 'white'],
      [0, 1, 'black'],
      [2, 1, 'black'],
      [1, 0, 'black'],
      [0, 2, 'white'],
      [2, 2, 'white'],
      [1, 3, 'white'],
    ])
    const afterCapture = applyAction(state, 'black', { type: 'place', row: 1, col: 2 }).state
    expect(afterCapture.cells[at(1, 1)]).toBe('empty')
    expect(afterCapture.koPoint).toEqual({ row: 1, col: 1 })
    expect(
      isLegalPlacement(afterCapture.cells, SIZE, 1, 1, 'white', afterCapture.koPoint),
    ).toBe(false)
    expect(() =>
      applyAction(afterCapture, 'white', { type: 'place', row: 1, col: 1 }),
    ).toThrow('劫')

    let lifted = applyAction(afterCapture, 'white', { type: 'pass' }).state
    lifted = applyAction(lifted, 'black', { type: 'place', row: 10, col: 10 }).state
    expect(lifted.koPoint).toBeNull()

    const recaptured = applyAction(lifted, 'white', { type: 'place', row: 1, col: 1 }).state
    expect(recaptured.cells[at(1, 2)]).toBe('empty')
    expect(recaptured.captured.white).toBe(1)
  })

  it('双方连续停一手结束，并按数子结果判定胜负', () => {
    const firstPass = applyAction(createInitialState(), 'black', { type: 'pass' }).state
    expect(firstPass.currentPlayer).toBe('white')
    expect(firstPass.consecutivePasses).toBe(1)

    const transition = applyAction(firstPass, 'white', { type: 'pass' })
    const finished = transition.state
    expect(finished.status).toBe('completed')
    expect(finished.endReason).toBe('two-passes')
    expect(finished.winner).toBe('white')
    expect(finished.score).toEqual({ black: 0, white: 7.5, komi: 7.5 })
    expect(selectResult(finished)).toEqual({ outcome: 'win', winner: 'white' })
    expect(selectScore(finished)).toEqual({ black: 0, white: 7.5, komi: 7.5 })
    expect(transition.events.at(-1)).toMatchObject({
      type: 'game.finished',
      reason: 'two-passes',
    })
  })

  it('数子：只把仅被单方围住的空点算作目，白方加贴目', () => {
    const state = stateWith('black', [])
    const cells = state.cells.slice()
    for (let row = 0; row <= 2; row += 1) {
      for (let col = 0; col <= 2; col += 1) {
        if (row === 1 && col === 1) {
          continue
        }
        cells[at(row, col)] = 'black'
      }
    }
    for (const [row, col] of [
      [4, 5],
      [6, 5],
      [5, 4],
      [5, 6],
    ] as const) {
      cells[at(row, col)] = 'white'
    }

    expect(scoreBoard(cells, SIZE)).toEqual({ black: 9, white: 12.5, komi: 7.5 })
  })

  it('认输后对手获胜', () => {
    const transition = applyAction(createInitialState(), 'black', { type: 'resign' })
    expect(transition.state.status).toBe('completed')
    expect(transition.state.winner).toBe('white')
    expect(transition.state.endReason).toBe('resign')
    expect(transition.state.score).toBeNull()
  })

  it('collectGroup 统计连通块与气数', () => {
    const state = stateWith('black', [
      [0, 0, 'black'],
      [0, 1, 'black'],
      [1, 0, 'black'],
    ])
    const group = collectGroup(state.cells, SIZE, 0, 0)
    expect(group?.stones).toHaveLength(3)
    expect(group?.liberties).toBe(3)
  })
})