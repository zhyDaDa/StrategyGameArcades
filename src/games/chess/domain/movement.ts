import { CHESS_PROMOTION_TYPES } from './types'
import type {
  ChessCastleSide,
  ChessCastlingBySide,
  ChessCoord,
  ChessPiece,
  ChessPosition,
  ChessPromotionType,
  ChessSide,
} from './types'

const ORTHOGONAL = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
] as const

const DIAGONAL = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 1 },
] as const

const ALL_DIRECTIONS = [...ORTHOGONAL, ...DIAGONAL] as const

const KNIGHT_STEPS = [
  { dr: -2, dc: -1 },
  { dr: -2, dc: 1 },
  { dr: -1, dc: -2 },
  { dr: -1, dc: 2 },
  { dr: 1, dc: -2 },
  { dr: 1, dc: 2 },
  { dr: 2, dc: -1 },
  { dr: 2, dc: 1 },
] as const

const KING_STEPS = ALL_DIRECTIONS

export interface ChessMove {
  readonly from: ChessCoord
  readonly to: ChessCoord
  readonly promotion: ChessPromotionType | null
}

export function opponentOf(side: ChessSide): ChessSide {
  return side === 'white' ? 'black' : 'white'
}

export function indexOf(cols: number, row: number, col: number): number {
  return row * cols + col
}

export function inBounds(rows: number, cols: number, row: number, col: number): boolean {
  return row >= 0 && row < rows && col >= 0 && col < cols
}

export function sameCoord(a: ChessCoord, b: ChessCoord): boolean {
  return a.row === b.row && a.col === b.col
}

export function pieceAt(
  cells: readonly (ChessPiece | null)[],
  cols: number,
  row: number,
  col: number,
): ChessPiece | null {
  return cells[indexOf(cols, row, col)] ?? null
}

export function findKing(
  cells: readonly (ChessPiece | null)[],
  cols: number,
  side: ChessSide,
): ChessCoord {
  for (let index = 0; index < cells.length; index += 1) {
    const piece = cells[index]
    if (piece !== null && piece.side === side && piece.type === 'king') {
      return { row: Math.floor(index / cols), col: index % cols }
    }
  }
  throw new Error(`局面中找不到${side === 'white' ? '白' : '黑'}方王`)
}

/** 某格是否被 `bySide` 的任意棋子攻击；王、兵、跳子与滑子都在这里统一判定。 */
export function isSquareAttacked(
  position: Readonly<ChessPosition>,
  row: number,
  col: number,
  bySide: ChessSide,
): boolean {
  const { cells, rows, cols } = position

  const pawnDir = bySide === 'white' ? -1 : 1
  for (const dc of [-1, 1]) {
    const pawnRow = row - pawnDir
    const pawnCol = col + dc
    if (!inBounds(rows, cols, pawnRow, pawnCol)) {
      continue
    }
    const piece = cells[indexOf(cols, pawnRow, pawnCol)]
    if (piece !== null && piece.side === bySide && piece.type === 'pawn') {
      return true
    }
  }

  for (const { dr, dc } of KNIGHT_STEPS) {
    const targetRow = row + dr
    const targetCol = col + dc
    if (!inBounds(rows, cols, targetRow, targetCol)) {
      continue
    }
    const piece = cells[indexOf(cols, targetRow, targetCol)]
    if (piece !== null && piece.side === bySide && piece.type === 'knight') {
      return true
    }
  }

  for (const { dr, dc } of KING_STEPS) {
    const targetRow = row + dr
    const targetCol = col + dc
    if (!inBounds(rows, cols, targetRow, targetCol)) {
      continue
    }
    const piece = cells[indexOf(cols, targetRow, targetCol)]
    if (piece !== null && piece.side === bySide && piece.type === 'king') {
      return true
    }
  }

  const slider = (directions: readonly { readonly dr: number; readonly dc: number }[], types: readonly string[]) => {
    for (const { dr, dc } of directions) {
      let targetRow = row + dr
      let targetCol = col + dc
      while (inBounds(rows, cols, targetRow, targetCol)) {
        const piece = cells[indexOf(cols, targetRow, targetCol)]
        if (piece !== null) {
          if (piece.side === bySide && types.includes(piece.type)) {
            return true
          }
          break
        }
        targetRow += dr
        targetCol += dc
      }
    }
    return false
  }

  return slider(ORTHOGONAL, ['rook', 'queen']) || slider(DIAGONAL, ['bishop', 'queen'])
}

export function isInCheck(position: Readonly<ChessPosition>, side: ChessSide): boolean {
  const king = findKing(position.cells, position.cols, side)
  return isSquareAttacked(position, king.row, king.col, opponentOf(side))
}

function pushMove(
  moves: ChessMove[],
  from: ChessCoord,
  to: ChessCoord,
  promotion: ChessPromotionType | null = null,
): void {
  moves.push({ from, to, promotion })
}

function pushPromotionMoves(moves: ChessMove[], from: ChessCoord, to: ChessCoord): void {
  for (const promotion of CHESS_PROMOTION_TYPES) {
    pushMove(moves, from, to, promotion)
  }
}

function pushRayMoves(
  position: Readonly<ChessPosition>,
  from: ChessCoord,
  side: ChessSide,
  directions: readonly { readonly dr: number; readonly dc: number }[],
  moves: ChessMove[],
): void {
  const { cells, rows, cols } = position
  for (const { dr, dc } of directions) {
    let row = from.row + dr
    let col = from.col + dc
    while (inBounds(rows, cols, row, col)) {
      const target = cells[indexOf(cols, row, col)]
      if (target === null) {
        pushMove(moves, from, { row, col })
      } else {
        if (target.side !== side) {
          pushMove(moves, from, { row, col })
        }
        break
      }
      row += dr
      col += dc
    }
  }
}

/**
 * 一枚棋子的几何走法（含升变的四种选择，不含王车易位）。
 * 合法性由 generateLegalMoves 统一过滤。
 */
export function getPieceMoves(
  position: Readonly<ChessPosition>,
  from: ChessCoord,
): readonly ChessMove[] {
  const { cells, rows, cols, enPassantTarget } = position
  if (!inBounds(rows, cols, from.row, from.col)) {
    throw new Error(`起点越界：(${from.row}, ${from.col})`)
  }
  const piece = cells[indexOf(cols, from.row, from.col)]
  if (piece === null) {
    throw new Error(`起点没有棋子：(${from.row}, ${from.col})`)
  }

  const moves: ChessMove[] = []
  const { side, type } = piece

  switch (type) {
    case 'pawn': {
      const forward = side === 'white' ? -1 : 1
      const startRow = side === 'white' ? 6 : 1
      const promotionRow = side === 'white' ? 0 : 7

      const oneRow = from.row + forward
      if (inBounds(rows, cols, oneRow, from.col)) {
        const oneCell = cells[indexOf(cols, oneRow, from.col)]
        if (oneCell === null) {
          if (oneRow === promotionRow) {
            pushPromotionMoves(moves, from, { row: oneRow, col: from.col })
          } else {
            pushMove(moves, from, { row: oneRow, col: from.col })
            const twoRow = from.row + forward * 2
            if (
              from.row === startRow &&
              inBounds(rows, cols, twoRow, from.col) &&
              cells[indexOf(cols, twoRow, from.col)] === null
            ) {
              pushMove(moves, from, { row: twoRow, col: from.col })
            }
          }
        }
      }

      for (const dc of [-1, 1]) {
        const targetRow = from.row + forward
        const targetCol = from.col + dc
        if (!inBounds(rows, cols, targetRow, targetCol)) {
          continue
        }
        const target = cells[indexOf(cols, targetRow, targetCol)]
        if (target !== null) {
          if (target.side !== side) {
            if (targetRow === promotionRow) {
              pushPromotionMoves(moves, from, { row: targetRow, col: targetCol })
            } else {
              pushMove(moves, from, { row: targetRow, col: targetCol })
            }
          }
          continue
        }
        if (enPassantTarget === null || !sameCoord(enPassantTarget, { row: targetRow, col: targetCol })) {
          continue
        }
        const passedPawn = cells[indexOf(cols, from.row, targetCol)]
        if (passedPawn !== null && passedPawn.side !== side && passedPawn.type === 'pawn') {
          pushMove(moves, from, { row: targetRow, col: targetCol })
        }
      }
      break
    }

    case 'knight': {
      for (const { dr, dc } of KNIGHT_STEPS) {
        const row = from.row + dr
        const col = from.col + dc
        if (!inBounds(rows, cols, row, col)) {
          continue
        }
        const target = cells[indexOf(cols, row, col)]
        if (target === null || target.side !== side) {
          pushMove(moves, from, { row, col })
        }
      }
      break
    }

    case 'bishop': {
      pushRayMoves(position, from, side, DIAGONAL, moves)
      break
    }

    case 'rook': {
      pushRayMoves(position, from, side, ORTHOGONAL, moves)
      break
    }

    case 'queen': {
      pushRayMoves(position, from, side, ALL_DIRECTIONS, moves)
      break
    }

    case 'king': {
      for (const { dr, dc } of KING_STEPS) {
        const row = from.row + dr
        const col = from.col + dc
        if (!inBounds(rows, cols, row, col)) {
          continue
        }
        const target = cells[indexOf(cols, row, col)]
        if (target === null || target.side !== side) {
          pushMove(moves, from, { row, col })
        }
      }
      break
    }
  }

  return moves
}

/** 王车易位的几何与安全条件；当前未被将军由调用方先确认。 */
export function getCastlingMoves(
  position: Readonly<ChessPosition>,
  side: ChessSide,
): readonly ChessMove[] {
  const { cells, cols, castling } = position
  const homeRow = side === 'white' ? 7 : 0
  const king = cells[indexOf(cols, homeRow, 4)]
  if (king === null || king.side !== side || king.type !== 'king') {
    return []
  }

  const enemy = opponentOf(side)
  if (isSquareAttacked(position, homeRow, 4, enemy)) {
    return []
  }
  const rights = castling[side]
  const rookAt = (col: number): boolean => {
    const piece = cells[indexOf(cols, homeRow, col)]
    return piece !== null && piece.side === side && piece.type === 'rook'
  }
  const empty = (col: number): boolean => cells[indexOf(cols, homeRow, col)] === null

  const moves: ChessMove[] = []

  if (
    rights.kingSide &&
    empty(5) &&
    empty(6) &&
    rookAt(7) &&
    !isSquareAttacked(position, homeRow, 5, enemy) &&
    !isSquareAttacked(position, homeRow, 6, enemy)
  ) {
    pushMove(moves, { row: homeRow, col: 4 }, { row: homeRow, col: 6 })
  }

  if (
    rights.queenSide &&
    empty(1) &&
    empty(2) &&
    empty(3) &&
    rookAt(0) &&
    !isSquareAttacked(position, homeRow, 3, enemy) &&
    !isSquareAttacked(position, homeRow, 2, enemy)
  ) {
    pushMove(moves, { row: homeRow, col: 4 }, { row: homeRow, col: 2 })
  }

  return moves
}

export interface PositionMoveResult {
  readonly position: ChessPosition
  readonly moved: ChessPiece
  readonly captured: ChessPiece | null
  readonly capturedAt: ChessCoord | null
  readonly promotion: ChessPromotionType | null
  readonly castleSide: ChessCastleSide | null
  readonly enPassant: boolean
}

interface MutableCastlingRights {
  kingSide: boolean
  queenSide: boolean
}

interface MutableCastling {
  white: MutableCastlingRights
  black: MutableCastlingRights
}

function cloneCastling(castling: ChessCastlingBySide): MutableCastling {
  return {
    white: { ...castling.white },
    black: { ...castling.black },
  }
}

function clearRookRightAt(
  castling: MutableCastling,
  side: ChessSide,
  row: number,
  col: number,
): void {
  const homeRow = side === 'white' ? 7 : 0
  if (row !== homeRow) {
    return
  }
  if (col === 0) {
    castling[side].queenSide = false
  } else if (col === 7) {
    castling[side].kingSide = false
  }
}

function updateCastlingRights(
  castling: ChessCastlingBySide,
  moved: ChessPiece,
  from: ChessCoord,
  captured: ChessPiece | null,
  capturedAt: ChessCoord | null,
): ChessCastlingBySide {
  const next = cloneCastling(castling)

  if (moved.type === 'king') {
    next[moved.side].kingSide = false
    next[moved.side].queenSide = false
  } else if (moved.type === 'rook') {
    clearRookRightAt(next, moved.side, from.row, from.col)
  }

  if (captured !== null && captured.type === 'rook' && capturedAt !== null) {
    clearRookRightAt(next, captured.side, capturedAt.row, capturedAt.col)
  }

  return next
}

/**
 * 按一枚走法推进局面：处理吃子、吃过路兵、王车易位、升变、
 * 易位权利失效与新的吃过路兵目标。这里是规则与 AI 模拟共用的唯一执行路径。
 */
export function advancePosition(
  position: Readonly<ChessPosition>,
  move: ChessMove,
): PositionMoveResult {
  const { cells, rows, cols } = position
  const { from, to } = move
  if (!inBounds(rows, cols, from.row, from.col) || !inBounds(rows, cols, to.row, to.col)) {
    throw new Error(`走法越界：(${from.row}, ${from.col}) -> (${to.row}, ${to.col})`)
  }

  const moved = cells[indexOf(cols, from.row, from.col)]
  if (moved === null) {
    throw new Error(`起点没有棋子：(${from.row}, ${from.col})`)
  }

  const castleSide: ChessCastleSide | null =
    moved.type === 'king' && from.row === to.row && Math.abs(to.col - from.col) === 2
      ? to.col > from.col
        ? 'king-side'
        : 'queen-side'
      : null

  const enPassant =
    moved.type === 'pawn' &&
    position.enPassantTarget !== null &&
    sameCoord(position.enPassantTarget, to) &&
    cells[indexOf(cols, to.row, to.col)] === null

  const capturedAt: ChessCoord | null = enPassant
    ? { row: from.row, col: to.col }
    : to
  const captured = cells[indexOf(cols, capturedAt.row, capturedAt.col)] ?? null

  const promotionRow = moved.side === 'white' ? 0 : 7
  const reachesLastRank = moved.type === 'pawn' && to.row === promotionRow
  if (reachesLastRank && move.promotion === null) {
    throw new Error('兵到达底线时必须指定升变棋子')
  }
  if (!reachesLastRank && move.promotion !== null) {
    throw new Error('只有兵到达底线时才能升变')
  }

  const nextCells = cells.slice()
  nextCells[indexOf(cols, from.row, from.col)] = null
  nextCells[indexOf(cols, to.row, to.col)] =
    move.promotion === null ? moved : { side: moved.side, type: move.promotion }
  if (enPassant) {
    nextCells[indexOf(cols, capturedAt.row, capturedAt.col)] = null
  }

  if (castleSide !== null) {
    const rookFromCol = castleSide === 'king-side' ? 7 : 0
    const rookToCol = castleSide === 'king-side' ? 5 : 3
    nextCells[indexOf(cols, to.row, rookToCol)] =
      nextCells[indexOf(cols, from.row, rookFromCol)] ?? null
    nextCells[indexOf(cols, from.row, rookFromCol)] = null
  }

  const castling = updateCastlingRights(
    position.castling,
    moved,
    from,
    captured,
    captured === null ? null : capturedAt,
  )

  const enPassantTarget =
    moved.type === 'pawn' && Math.abs(to.row - from.row) === 2
      ? { row: (from.row + to.row) / 2, col: from.col }
      : null

  return {
    position: { rows, cols, cells: nextCells, castling, enPassantTarget },
    moved,
    captured,
    capturedAt: captured === null ? null : capturedAt,
    promotion: move.promotion,
    castleSide,
    enPassant,
  }
}

/** 当前局面下该方的全部合法走法；王车易位同时校验易位权利与经过格安全。 */
export function generateLegalMoves(
  position: Readonly<ChessPosition>,
  side: ChessSide,
): readonly ChessMove[] {
  const { cells, cols } = position
  const inCheck = isInCheck(position, side)
  const moves: ChessMove[] = []

  for (let index = 0; index < cells.length; index += 1) {
    const piece = cells[index]
    if (piece === null || piece.side !== side) {
      continue
    }
    const from = { row: Math.floor(index / cols), col: index % cols }
    for (const move of getPieceMoves(position, from)) {
      const next = advancePosition(position, move)
      if (!isInCheck(next.position, side)) {
        moves.push(move)
      }
    }
  }

  if (!inCheck) {
    for (const move of getCastlingMoves(position, side)) {
      const next = advancePosition(position, move)
      if (!isInCheck(next.position, side)) {
        moves.push(move)
      }
    }
  }

  return moves
}