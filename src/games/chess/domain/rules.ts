import type { Transition } from '@/core/contracts/game'
import {
  advancePosition,
  generateLegalMoves,
  indexOf,
  isInCheck,
  opponentOf,
  sameCoord,
  type ChessMove,
} from './movement'
import {
  CHESS_COLS,
  CHESS_FIFTY_MOVE_HALFMOVES,
  CHESS_ROWS,
  type ChessAction,
  type ChessCastlingBySide,
  type ChessEvent,
  type ChessPiece,
  type ChessPieceType,
  type ChessSide,
  type ChessState,
} from './types'

const BACK_RANK: readonly ChessPieceType[] = [
  'rook',
  'knight',
  'bishop',
  'queen',
  'king',
  'bishop',
  'knight',
  'rook',
]

const FULL_CASTLING: ChessCastlingBySide = {
  white: { kingSide: true, queenSide: true },
  black: { kingSide: true, queenSide: true },
}

function createFullCastling(): ChessCastlingBySide {
  return {
    white: { ...FULL_CASTLING.white },
    black: { ...FULL_CASTLING.black },
  }
}

export function isChessSide(value: string): value is ChessSide {
  return value === 'white' || value === 'black'
}

export function createInitialState(): ChessState {
  const cells = Array<ChessPiece | null>(CHESS_ROWS * CHESS_COLS).fill(null)

  for (let col = 0; col < CHESS_COLS; col += 1) {
    const type = BACK_RANK[col]
    if (type === undefined) {
      throw new Error(`国际象棋初始布局缺少第 ${col} 列的后排棋子`)
    }
    cells[indexOf(CHESS_COLS, 0, col)] = { side: 'black', type }
    cells[indexOf(CHESS_COLS, 7, col)] = { side: 'white', type }
    cells[indexOf(CHESS_COLS, 1, col)] = { side: 'black', type: 'pawn' }
    cells[indexOf(CHESS_COLS, 6, col)] = { side: 'white', type: 'pawn' }
  }

  return {
    rows: CHESS_ROWS,
    cols: CHESS_COLS,
    cells,
    castling: createFullCastling(),
    enPassantTarget: null,
    status: 'playing',
    currentPlayer: 'white',
    winner: null,
    endReason: null,
    lastMove: null,
    moveCount: 0,
    halfmoveClock: 0,
  }
}

function moveToAction(move: ChessMove): ChessAction {
  return move.promotion === null
    ? { type: 'move', from: move.from, to: move.to }
    : { type: 'move', from: move.from, to: move.to, promotion: move.promotion }
}

function actionToMove(action: ChessAction): ChessMove {
  return {
    from: action.from,
    to: action.to,
    promotion: action.promotion ?? null,
  }
}

function sameMove(a: ChessMove, b: ChessMove): boolean {
  return (
    sameCoord(a.from, b.from) &&
    sameCoord(a.to, b.to) &&
    a.promotion === b.promotion
  )
}

export function listLegalActions(
  state: Readonly<ChessState>,
  side: ChessSide,
): readonly ChessAction[] {
  if (state.status !== 'playing' || state.currentPlayer !== side) {
    return []
  }
  return generateLegalMoves(state, side).map(moveToAction)
}

/**
 * 子力不足判和：只剩王；或一方仅多一马 / 一象；
 * 或双方各有一象且两象同色格（无法构成杀王）。
 */
export function hasInsufficientMaterial(
  cells: readonly (ChessPiece | null)[],
  cols: number,
): boolean {
  const bishops: { readonly side: ChessSide; readonly color: number }[] = []
  let knights = 0

  for (let index = 0; index < cells.length; index += 1) {
    const piece = cells[index]
    if (piece === null) {
      continue
    }
    switch (piece.type) {
      case 'king':
        break
      case 'pawn':
      case 'rook':
      case 'queen':
        return false
      case 'bishop':
        bishops.push({
          side: piece.side,
          color: (Math.floor(index / cols) + (index % cols)) % 2,
        })
        break
      case 'knight':
        knights += 1
        break
    }
  }

  const minors = bishops.length + knights
  if (minors === 0) {
    return true
  }
  if (knights === 0 && bishops.length === 1) {
    return true
  }
  if (knights === 1 && bishops.length === 0) {
    return true
  }
  if (
    knights === 0 &&
    bishops.length === 2 &&
    bishops[0]?.side !== bishops[1]?.side &&
    bishops[0]?.color === bishops[1]?.color
  ) {
    return true
  }
  return false
}

export function applyAction(
  state: Readonly<ChessState>,
  side: ChessSide,
  action: ChessAction,
): Transition<ChessState, ChessEvent> {
  if (state.status !== 'playing' || state.currentPlayer !== side) {
    throw new Error('非法状态：对局未进行或非当前玩家')
  }

  const move = actionToMove(action)
  const legal = generateLegalMoves(state, side)
  if (!legal.some((candidate) => sameMove(candidate, move))) {
    const piece = state.cells[indexOf(state.cols, action.from.row, action.from.col)]
    const promotionRow = piece?.side === 'white' ? 0 : 7
    if (
      piece !== null &&
      piece !== undefined &&
      piece.type === 'pawn' &&
      action.to.row === promotionRow &&
      move.promotion === null
    ) {
      throw new Error('兵到达底线时必须指定升变棋子')
    }
    throw new Error('非法走法：该棋子在当前局面不能走到目标格')
  }

  const applied = advancePosition(state, move)
  const opponent = opponentOf(side)
  const opponentInCheck = isInCheck(applied.position, opponent)
  const opponentHasMove = generateLegalMoves(applied.position, opponent).length > 0
  const halfmoveClock =
    applied.moved.type === 'pawn' || applied.captured !== null ? 0 : state.halfmoveClock + 1
  const lastMove = {
    from: move.from,
    to: move.to,
    piece: applied.moved,
    captured: applied.captured,
    promotion: applied.promotion,
    castleSide: applied.castleSide,
    enPassant: applied.enPassant,
  }
  const base: ChessState = {
    ...state,
    ...applied.position,
    lastMove,
    moveCount: state.moveCount + 1,
    halfmoveClock,
  }
  const events: ChessEvent[] = [
    {
      type: 'piece.moved',
      playerId: side,
      from: move.from,
      to: move.to,
      piece: applied.moved,
      captured: applied.captured,
      promotion: applied.promotion,
      castleSide: applied.castleSide,
      enPassant: applied.enPassant,
    },
  ]

  if (!opponentHasMove) {
    const reason = opponentInCheck ? 'checkmate' : 'stalemate'
    const result = opponentInCheck
      ? ({ outcome: 'win', winner: side } as const)
      : ({ outcome: 'draw' } as const)
    events.push({ type: 'game.finished', result, reason })
    return {
      state: {
        ...base,
        status: 'completed',
        currentPlayer: null,
        winner: opponentInCheck ? side : null,
        endReason: reason,
      },
      events,
    }
  }

  if (hasInsufficientMaterial(applied.position.cells, applied.position.cols)) {
    events.push({
      type: 'game.finished',
      result: { outcome: 'draw' },
      reason: 'insufficient-material',
    })
    return {
      state: {
        ...base,
        status: 'completed',
        currentPlayer: null,
        winner: null,
        endReason: 'insufficient-material',
      },
      events,
    }
  }

  if (halfmoveClock >= CHESS_FIFTY_MOVE_HALFMOVES) {
    events.push({
      type: 'game.finished',
      result: { outcome: 'draw' },
      reason: 'fifty-move-draw',
    })
    return {
      state: {
        ...base,
        status: 'completed',
        currentPlayer: null,
        winner: null,
        endReason: 'fifty-move-draw',
      },
      events,
    }
  }

  if (opponentInCheck) {
    events.push({ type: 'check.given', playerId: side, checkedPlayerId: opponent })
  }

  return {
    state: {
      ...base,
      status: 'playing',
      currentPlayer: opponent,
      winner: null,
      endReason: null,
    },
    events,
  }
}