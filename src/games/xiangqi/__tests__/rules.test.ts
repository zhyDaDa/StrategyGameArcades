import { describe, expect, it } from 'vitest'
import {
  generateLegalMoves,
  getPieceTargets,
  hasCrossedRiver,
  isInCheck,
} from '../domain/movement'
import { applyAction, createInitialState } from '../domain/rules'
import { XIANGQI_NO_CAPTURE_PLIES } from '../domain/types'
import { hasMove, stateFromPieces } from './fixtures'

const RED_GENERAL = { row: 9, col: 4, side: 'red', type: 'general' } as const
const BLACK_GENERAL = { row: 0, col: 4, side: 'black', type: 'general' } as const

describe('中国象棋规则', () => {
  it('初始局面：32 枚棋子、红先，红方有 44 种合法着法', () => {
    const state = createInitialState()
    expect(state.cells.filter((cell) => cell !== null)).toHaveLength(32)
    expect(state.cells.filter((cell) => cell?.side === 'red')).toHaveLength(16)
    expect(state.cells.filter((cell) => cell?.side === 'black')).toHaveLength(16)
    expect(state.currentPlayer).toBe('red')
    expect(generateLegalMoves(state.cells, state.rows, state.cols, 'red')).toHaveLength(44)
    expect(generateLegalMoves(state.cells, state.rows, state.cols, 'black')).toHaveLength(44)
  })

  it('蹩马腿：马腿上的棋子会挡住对应方向', () => {
    const blocked = stateFromPieces([
      RED_GENERAL,
      BLACK_GENERAL,
      { row: 4, col: 4, side: 'red', type: 'horse' },
      { row: 3, col: 4, side: 'red', type: 'soldier' },
    ])
    const blockedTargets = getPieceTargets(blocked.cells, blocked.rows, blocked.cols, {
      row: 4,
      col: 4,
    })
    expect(blockedTargets).not.toContainEqual({ row: 2, col: 3 })
    expect(blockedTargets).not.toContainEqual({ row: 2, col: 5 })
    expect(blockedTargets).toContainEqual({ row: 3, col: 2 })
    expect(blockedTargets).toContainEqual({ row: 3, col: 6 })

    const free = stateFromPieces([
      RED_GENERAL,
      BLACK_GENERAL,
      { row: 4, col: 4, side: 'red', type: 'horse' },
    ])
    const freeTargets = getPieceTargets(free.cells, free.rows, free.cols, { row: 4, col: 4 })
    expect(freeTargets).toContainEqual({ row: 2, col: 3 })
    expect(freeTargets).toContainEqual({ row: 2, col: 5 })
  })

  it('相不过河：红相在河界前一排只能往己方半场走', () => {
    const state = stateFromPieces([
      RED_GENERAL,
      BLACK_GENERAL,
      { row: 5, col: 2, side: 'red', type: 'elephant' },
    ])
    const targets = getPieceTargets(state.cells, state.rows, state.cols, { row: 5, col: 2 })
    expect(targets).toContainEqual({ row: 7, col: 0 })
    expect(targets).toContainEqual({ row: 7, col: 4 })
    expect(targets.some((target) => target.row === 3)).toBe(false)
  })

  it('炮必须隔一枚棋子吃子，且不能直接吃相邻棋子', () => {
    const withScreen = stateFromPieces([
      RED_GENERAL,
      BLACK_GENERAL,
      { row: 7, col: 1, side: 'red', type: 'cannon' },
      { row: 4, col: 1, side: 'black', type: 'soldier' },
      { row: 2, col: 1, side: 'black', type: 'chariot' },
    ])
    expect(
      getPieceTargets(withScreen.cells, withScreen.rows, withScreen.cols, { row: 7, col: 1 }),
    ).toContainEqual({ row: 2, col: 1 })

    const withoutScreen = stateFromPieces([
      RED_GENERAL,
      BLACK_GENERAL,
      { row: 7, col: 1, side: 'red', type: 'cannon' },
      { row: 6, col: 1, side: 'black', type: 'soldier' },
    ])
    const targets = getPieceTargets(
      withoutScreen.cells,
      withoutScreen.rows,
      withoutScreen.cols,
      { row: 7, col: 1 },
    )
    expect(targets).not.toContainEqual({ row: 6, col: 1 })
    expect(targets).toContainEqual({ row: 8, col: 1 })
  })

  it('将帅不得照面：不能走成让双方将帅直接相对的局面', () => {
    const state = stateFromPieces([
      RED_GENERAL,
      BLACK_GENERAL,
      { row: 5, col: 4, side: 'red', type: 'chariot' },
    ])
    const moves = generateLegalMoves(state.cells, state.rows, state.cols, 'red')
    expect(hasMove(moves, 5, 4, 5, 3)).toBe(false)
    expect(hasMove(moves, 5, 4, 6, 4)).toBe(true)

    const facing = stateFromPieces([RED_GENERAL, BLACK_GENERAL])
    expect(isInCheck(facing.cells, facing.rows, facing.cols, 'red')).toBe(true)
    expect(isInCheck(facing.cells, facing.rows, facing.cols, 'black')).toBe(true)
  })

  it('困毙：未被将军但无任何合法着法', () => {
    const state = stateFromPieces(
      [
        RED_GENERAL,
        BLACK_GENERAL,
        { row: 5, col: 4, side: 'red', type: 'horse' },
        { row: 1, col: 3, side: 'red', type: 'soldier' },
        { row: 1, col: 5, side: 'red', type: 'soldier' },
      ],
      'black',
    )
    expect(isInCheck(state.cells, state.rows, state.cols, 'black')).toBe(false)
    expect(generateLegalMoves(state.cells, state.rows, state.cols, 'black')).toHaveLength(0)
  })

  it('将死：被将军且所有应将着法都不存在', () => {
    const state = stateFromPieces(
      [
        RED_GENERAL,
        BLACK_GENERAL,
        { row: 1, col: 4, side: 'red', type: 'chariot' },
        { row: 1, col: 3, side: 'red', type: 'soldier' },
        { row: 1, col: 5, side: 'red', type: 'soldier' },
      ],
      'black',
    )
    expect(isInCheck(state.cells, state.rows, state.cols, 'black')).toBe(true)
    expect(generateLegalMoves(state.cells, state.rows, state.cols, 'black')).toHaveLength(0)
  })

  it('把对方走成困毙时判胜，而不是和棋', () => {
    const state = stateFromPieces([
      RED_GENERAL,
      BLACK_GENERAL,
      { row: 5, col: 4, side: 'red', type: 'horse' },
      { row: 1, col: 3, side: 'red', type: 'soldier' },
      { row: 2, col: 5, side: 'red', type: 'soldier' },
    ])
    const transition = applyAction(state, 'red', {
      type: 'move',
      from: { row: 2, col: 5 },
      to: { row: 1, col: 5 },
    })
    expect(transition.state.status).toBe('completed')
    expect(transition.state.winner).toBe('red')
    expect(transition.state.endReason).toBe('stalemate')
  })

  it('连续 60 回合无吃子判和', () => {
    const state = {
      ...createInitialState(),
      noCapturePlies: XIANGQI_NO_CAPTURE_PLIES - 1,
    }
    const transition = applyAction(state, 'red', {
      type: 'move',
      from: { row: 6, col: 0 },
      to: { row: 5, col: 0 },
    })
    expect(transition.state.status).toBe('completed')
    expect(transition.state.endReason).toBe('no-capture-draw')
    expect(transition.state.winner).toBeNull()
  })

  it('过河前后兵卒的横走能力由河界决定', () => {
    expect(hasCrossedRiver('red', 4)).toBe(true)
    expect(hasCrossedRiver('red', 5)).toBe(false)
    expect(hasCrossedRiver('black', 5)).toBe(true)
    expect(hasCrossedRiver('black', 4)).toBe(false)
  })
})