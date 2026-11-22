import { describe, expect, it } from 'vitest'
import { generateLegalMoves, isInCheck } from '../domain/movement'
import {
  applyAction,
  createInitialState,
  hasInsufficientMaterial,
  listLegalActions,
} from '../domain/rules'
import { selectResult } from '../domain/selectors'
import type { ChessState } from '../domain/types'
import {
  hasMove,
  stateFromPieces,
  whiteKingSideOnly,
  type PlacedPiece,
} from './fixtures'

const WHITE_KING = { row: 7, col: 4, side: 'white', type: 'king' } as const
const BLACK_KING = { row: 0, col: 4, side: 'black', type: 'king' } as const

function move(
  state: ChessState,
  side: 'white' | 'black',
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
): ChessState {
  return applyAction(state, side, {
    type: 'move',
    from: { row: fromRow, col: fromCol },
    to: { row: toRow, col: toCol },
  }).state
}

function cellsOf(pieces: readonly PlacedPiece[]) {
  return stateFromPieces(pieces).cells
}

describe('国际象棋规则', () => {
  it('初始局面：32 枚棋子、白先，双方各有 20 种合法着法', () => {
    const state = createInitialState()
    expect(state.cells.filter((cell) => cell !== null)).toHaveLength(32)
    expect(state.cells.filter((cell) => cell?.side === 'white')).toHaveLength(16)
    expect(state.cells.filter((cell) => cell?.side === 'black')).toHaveLength(16)
    expect(state.currentPlayer).toBe('white')
    expect(generateLegalMoves(state, 'white')).toHaveLength(20)
    expect(generateLegalMoves(state, 'black')).toHaveLength(20)
  })

  it('愚人杀：黑后 h4 将死白王', () => {
    let state = createInitialState()
    state = move(state, 'white', 6, 5, 5, 5) // f2-f3
    state = move(state, 'black', 1, 4, 3, 4) // e7-e5
    state = move(state, 'white', 6, 6, 4, 6) // g2-g4
    const transition = applyAction(state, 'black', {
      type: 'move',
      from: { row: 0, col: 3 },
      to: { row: 4, col: 7 },
    })

    expect(transition.state.status).toBe('completed')
    expect(transition.state.winner).toBe('black')
    expect(transition.state.endReason).toBe('checkmate')
    expect(transition.state.currentPlayer).toBeNull()
    expect(selectResult(transition.state)).toEqual({ outcome: 'win', winner: 'black' })
    expect(isInCheck(transition.state, 'white')).toBe(true)
  })

  it('王车易位：王与车同时移动，易位权利随即失效', () => {
    const state = stateFromPieces(
      [
        WHITE_KING,
        { row: 7, col: 7, side: 'white', type: 'rook' },
        BLACK_KING,
      ],
      { currentPlayer: 'white', castling: whiteKingSideOnly() },
    )
    expect(hasMove(generateLegalMoves(state, 'white'), 7, 4, 7, 6)).toBe(true)

    const transition = applyAction(state, 'white', {
      type: 'move',
      from: { row: 7, col: 4 },
      to: { row: 7, col: 6 },
    })
    expect(transition.state.cells[7 * 8 + 6]).toEqual({ side: 'white', type: 'king' })
    expect(transition.state.cells[7 * 8 + 5]).toEqual({ side: 'white', type: 'rook' })
    expect(transition.state.cells[7 * 8 + 7]).toBeNull()
    expect(transition.state.castling.white).toEqual({ kingSide: false, queenSide: false })
    expect(transition.state.lastMove?.castleSide).toBe('king-side')
  })

  it('王车易位不能经过被攻击的格子', () => {
    const state = stateFromPieces(
      [
        WHITE_KING,
        { row: 7, col: 7, side: 'white', type: 'rook' },
        BLACK_KING,
        { row: 0, col: 5, side: 'black', type: 'rook' },
      ],
      { currentPlayer: 'white', castling: whiteKingSideOnly() },
    )
    expect(hasMove(generateLegalMoves(state, 'white'), 7, 4, 7, 6)).toBe(false)
  })

  it('吃过路兵：目标格为空，但会移除相邻的兵', () => {
    const start = stateFromPieces(
      [
        WHITE_KING,
        BLACK_KING,
        { row: 3, col: 4, side: 'white', type: 'pawn' },
        { row: 1, col: 3, side: 'black', type: 'pawn' },
      ],
      { currentPlayer: 'black' },
    )

    const pushed = applyAction(start, 'black', {
      type: 'move',
      from: { row: 1, col: 3 },
      to: { row: 3, col: 3 },
    })
    expect(pushed.state.enPassantTarget).toEqual({ row: 2, col: 3 })
    expect(hasMove(generateLegalMoves(pushed.state, 'white'), 3, 4, 2, 3)).toBe(true)

    const captured = applyAction(pushed.state, 'white', {
      type: 'move',
      from: { row: 3, col: 4 },
      to: { row: 2, col: 3 },
    })
    expect(captured.state.cells[3 * 8 + 3]).toBeNull()
    expect(captured.state.cells[2 * 8 + 3]).toEqual({ side: 'white', type: 'pawn' })
    expect(captured.state.lastMove?.enPassant).toBe(true)
    expect(captured.state.lastMove?.captured).toEqual({ side: 'black', type: 'pawn' })
  })

  it('没有吃过路兵目标时不能斜吃空位', () => {
    const state = stateFromPieces([
      WHITE_KING,
      BLACK_KING,
      { row: 3, col: 4, side: 'white', type: 'pawn' },
      { row: 3, col: 3, side: 'black', type: 'pawn' },
    ])
    expect(hasMove(generateLegalMoves(state, 'white'), 3, 4, 2, 3)).toBe(false)
  })

  it('兵到底线必须升变，且只能选择后 / 车 / 象 / 马', () => {
    const state = stateFromPieces(
      [WHITE_KING, BLACK_KING, { row: 1, col: 0, side: 'white', type: 'pawn' }],
      { currentPlayer: 'white' },
    )
    const promotions = listLegalActions(state, 'white').filter(
      (action) => action.from.row === 1 && action.from.col === 0,
    )
    expect(promotions).toHaveLength(4)

    expect(() =>
      applyAction(state, 'white', {
        type: 'move',
        from: { row: 1, col: 0 },
        to: { row: 0, col: 0 },
      }),
    ).toThrow('升变')

    const transition = applyAction(state, 'white', {
      type: 'move',
      from: { row: 1, col: 0 },
      to: { row: 0, col: 0 },
      promotion: 'queen',
    })
    expect(transition.state.cells[0]).toEqual({ side: 'white', type: 'queen' })
    expect(transition.state.lastMove?.promotion).toBe('queen')
    expect(transition.state.halfmoveClock).toBe(0)
  })

  it('被牵制的棋子不能离开牵制线', () => {
    const state = stateFromPieces([
      WHITE_KING,
      { row: 6, col: 4, side: 'white', type: 'rook' },
      { row: 0, col: 4, side: 'black', type: 'rook' },
      { row: 0, col: 7, side: 'black', type: 'king' },
    ])
    const moves = generateLegalMoves(state, 'white')
    expect(hasMove(moves, 6, 4, 6, 3)).toBe(false)
    expect(hasMove(moves, 6, 4, 4, 4)).toBe(true)
    expect(isInCheck(state, 'white')).toBe(false)
  })

  it('逼和：未被将军但没有任何合法着法，判和', () => {
    const state = stateFromPieces(
      [
        { row: 0, col: 0, side: 'black', type: 'king' },
        { row: 2, col: 2, side: 'white', type: 'king' },
        { row: 3, col: 1, side: 'white', type: 'queen' },
      ],
      { currentPlayer: 'white' },
    )
    const transition = applyAction(state, 'white', {
      type: 'move',
      from: { row: 3, col: 1 },
      to: { row: 2, col: 1 },
    })

    expect(isInCheck(transition.state, 'black')).toBe(false)
    expect(generateLegalMoves(transition.state, 'black')).toHaveLength(0)
    expect(transition.state.status).toBe('completed')
    expect(transition.state.winner).toBeNull()
    expect(transition.state.endReason).toBe('stalemate')
    expect(selectResult(transition.state)).toEqual({ outcome: 'draw' })
  })

  it('子力不足判和的条件', () => {
    const kingOnly: PlacedPiece[] = [
      WHITE_KING,
      BLACK_KING,
    ]
    expect(hasInsufficientMaterial(cellsOf(kingOnly), 8)).toBe(true)
    expect(
      hasInsufficientMaterial(
        cellsOf([...kingOnly, { row: 7, col: 2, side: 'white', type: 'bishop' }]),
        8,
      ),
    ).toBe(true)
    expect(
      hasInsufficientMaterial(
        cellsOf([...kingOnly, { row: 7, col: 1, side: 'white', type: 'knight' }]),
        8,
      ),
    ).toBe(true)
    expect(
      hasInsufficientMaterial(
        cellsOf([
          ...kingOnly,
          { row: 7, col: 2, side: 'white', type: 'bishop' },
          { row: 0, col: 5, side: 'black', type: 'bishop' },
        ]),
        8,
      ),
    ).toBe(true)
    expect(
      hasInsufficientMaterial(
        cellsOf([
          ...kingOnly,
          { row: 7, col: 2, side: 'white', type: 'bishop' },
          { row: 0, col: 4, side: 'black', type: 'bishop' },
        ]),
        8,
      ),
    ).toBe(false)
    expect(
      hasInsufficientMaterial(
        cellsOf([...kingOnly, { row: 7, col: 0, side: 'white', type: 'rook' }]),
        8,
      ),
    ).toBe(false)
  })

  it('连续 50 回合未吃子或走兵判和', () => {
    const state: ChessState = { ...createInitialState(), halfmoveClock: 99 }
    const transition = applyAction(state, 'white', {
      type: 'move',
      from: { row: 7, col: 6 },
      to: { row: 5, col: 5 },
    })
    expect(transition.state.status).toBe('completed')
    expect(transition.state.endReason).toBe('fifty-move-draw')
    expect(transition.state.winner).toBeNull()
  })
})