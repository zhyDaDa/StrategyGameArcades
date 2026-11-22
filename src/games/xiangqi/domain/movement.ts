import type { XiangqiCoord, XiangqiPiece, XiangqiSide } from './types'

const ORTHOGONAL = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
] as const

const HORSE_MOVES = [
  { dr: -2, dc: -1 },
  { dr: -2, dc: 1 },
  { dr: -1, dc: -2 },
  { dr: -1, dc: 2 },
  { dr: 1, dc: -2 },
  { dr: 1, dc: 2 },
  { dr: 2, dc: -1 },
  { dr: 2, dc: 1 },
] as const

const DIAGONAL = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 1 },
] as const

export interface XiangqiMove {
  readonly from: XiangqiCoord
  readonly to: XiangqiCoord
}

export interface XiangqiMoveResult {
  readonly cells: readonly (XiangqiPiece | null)[]
  readonly moved: XiangqiPiece
  readonly captured: XiangqiPiece | null
}

export function opponentOf(side: XiangqiSide): XiangqiSide {
  return side === 'red' ? 'black' : 'red'
}

export function indexOf(cols: number, row: number, col: number): number {
  return row * cols + col
}

export function inBounds(rows: number, cols: number, row: number, col: number): boolean {
  return row >= 0 && row < rows && col >= 0 && col < cols
}

export function sameCoord(a: XiangqiCoord, b: XiangqiCoord): boolean {
  return a.row === b.row && a.col === b.col
}

/** 红方在下（row 7..9），黑方在上（row 0..2），中路三列。 */
export function isInPalace(side: XiangqiSide, row: number, col: number): boolean {
  if (col < 3 || col > 5) {
    return false
  }
  return side === 'red' ? row >= 7 && row <= 9 : row >= 0 && row <= 2
}

/** 相 / 象不得过河：红方在 row >= 5，黑方在 row <= 4。 */
function isOnOwnHalf(side: XiangqiSide, row: number): boolean {
  return side === 'red' ? row >= 5 : row <= 4
}

/** 兵 / 卒过河后可以横走：红方 row <= 4，黑方 row >= 5。 */
export function hasCrossedRiver(side: XiangqiSide, row: number): boolean {
  return side === 'red' ? row <= 4 : row >= 5
}

export function pieceAt(
  cells: readonly (XiangqiPiece | null)[],
  cols: number,
  row: number,
  col: number,
): XiangqiPiece | null {
  return cells[indexOf(cols, row, col)] ?? null
}

function addTarget(
  targets: XiangqiCoord[],
  cells: readonly (XiangqiPiece | null)[],
  rows: number,
  cols: number,
  row: number,
  col: number,
  side: XiangqiSide,
): void {
  if (!inBounds(rows, cols, row, col)) {
    return
  }
  const target = cells[indexOf(cols, row, col)]
  if (target === null || target.side !== side) {
    targets.push({ row, col })
  }
}

/**
 * 一枚棋子在当前局面下所有可到达的交叉点（含吃子点，不含己方棋子）。
 * 这是规则的唯一几何来源：走法生成、将军判定和 AI 模拟都复用它。
 */
export function getPieceTargets(
  cells: readonly (XiangqiPiece | null)[],
  rows: number,
  cols: number,
  from: XiangqiCoord,
): readonly XiangqiCoord[] {
  if (!inBounds(rows, cols, from.row, from.col)) {
    throw new Error(`起点越界：(${from.row}, ${from.col})`)
  }
  const piece = cells[indexOf(cols, from.row, from.col)]
  if (piece === null) {
    throw new Error(`起点没有棋子：(${from.row}, ${from.col})`)
  }

  const targets: XiangqiCoord[] = []
  const { side, type } = piece

  switch (type) {
    case 'general': {
      for (const { dr, dc } of ORTHOGONAL) {
        const row = from.row + dr
        const col = from.col + dc
        if (isInPalace(side, row, col)) {
          addTarget(targets, cells, rows, cols, row, col, side)
        }
      }
      // 飞将：同列无阻挡时可以直接“照将”对方将帅。
      for (const dr of [-1, 1]) {
        let row = from.row + dr
        while (inBounds(rows, cols, row, from.col)) {
          const blocking = cells[indexOf(cols, row, from.col)]
          if (blocking !== null) {
            if (blocking.side !== side && blocking.type === 'general') {
              targets.push({ row, col: from.col })
            }
            break
          }
          row += dr
        }
      }
      break
    }

    case 'advisor': {
      for (const { dr, dc } of DIAGONAL) {
        const row = from.row + dr
        const col = from.col + dc
        if (isInPalace(side, row, col)) {
          addTarget(targets, cells, rows, cols, row, col, side)
        }
      }
      break
    }

    case 'elephant': {
      for (const { dr, dc } of DIAGONAL) {
        const row = from.row + dr * 2
        const col = from.col + dc * 2
        const eyeRow = from.row + dr
        const eyeCol = from.col + dc
        if (!inBounds(rows, cols, row, col) || !isOnOwnHalf(side, row)) {
          continue
        }
        if (cells[indexOf(cols, eyeRow, eyeCol)] !== null) {
          continue
        }
        addTarget(targets, cells, rows, cols, row, col, side)
      }
      break
    }

    case 'horse': {
      for (const { dr, dc } of HORSE_MOVES) {
        const legRow = from.row + (Math.abs(dr) === 2 ? dr / 2 : 0)
        const legCol = from.col + (Math.abs(dc) === 2 ? dc / 2 : 0)
        if (!inBounds(rows, cols, legRow, legCol)) {
          continue
        }
        if (cells[indexOf(cols, legRow, legCol)] !== null) {
          continue
        }
        addTarget(targets, cells, rows, cols, from.row + dr, from.col + dc, side)
      }
      break
    }

    case 'chariot': {
      for (const { dr, dc } of ORTHOGONAL) {
        let row = from.row + dr
        let col = from.col + dc
        while (inBounds(rows, cols, row, col)) {
          const target = cells[indexOf(cols, row, col)]
          if (target === null) {
            targets.push({ row, col })
          } else {
            if (target.side !== side) {
              targets.push({ row, col })
            }
            break
          }
          row += dr
          col += dc
        }
      }
      break
    }

    case 'cannon': {
      for (const { dr, dc } of ORTHOGONAL) {
        let row = from.row + dr
        let col = from.col + dc
        let hasScreen = false
        while (inBounds(rows, cols, row, col)) {
          const target = cells[indexOf(cols, row, col)]
          if (!hasScreen) {
            if (target === null) {
              targets.push({ row, col })
            } else {
              hasScreen = true
            }
          } else if (target !== null) {
            if (target.side !== side) {
              targets.push({ row, col })
            }
            break
          }
          row += dr
          col += dc
        }
      }
      break
    }

    case 'soldier': {
      const forward = side === 'red' ? -1 : 1
      addTarget(targets, cells, rows, cols, from.row + forward, from.col, side)
      if (hasCrossedRiver(side, from.row)) {
        addTarget(targets, cells, rows, cols, from.row, from.col - 1, side)
        addTarget(targets, cells, rows, cols, from.row, from.col + 1, side)
      }
      break
    }
  }

  return targets
}

export function findGeneral(
  cells: readonly (XiangqiPiece | null)[],
  cols: number,
  side: XiangqiSide,
): XiangqiCoord {
  for (let index = 0; index < cells.length; index += 1) {
    const piece = cells[index]
    if (piece !== null && piece.side === side && piece.type === 'general') {
      return { row: Math.floor(index / cols), col: index % cols }
    }
  }
  throw new Error(`局面中找不到${side === 'red' ? '红' : '黑'}方将帅`)
}

/** 某一方是否正被将军（含飞将形成的将军）。 */
export function isInCheck(
  cells: readonly (XiangqiPiece | null)[],
  rows: number,
  cols: number,
  side: XiangqiSide,
): boolean {
  const general = findGeneral(cells, cols, side)
  const enemy = opponentOf(side)

  for (let index = 0; index < cells.length; index += 1) {
    const piece = cells[index]
    if (piece === null || piece.side !== enemy) {
      continue
    }
    const from = { row: Math.floor(index / cols), col: index % cols }
    const targets = getPieceTargets(cells, rows, cols, from)
    if (targets.some((target) => sameCoord(target, general))) {
      return true
    }
  }
  return false
}

/** 走子后不能让自己的将帅被将军；这里统一过滤掉所有“自杀”走法。 */
export function generateLegalMoves(
  cells: readonly (XiangqiPiece | null)[],
  rows: number,
  cols: number,
  side: XiangqiSide,
): readonly XiangqiMove[] {
  const moves: XiangqiMove[] = []

  for (let index = 0; index < cells.length; index += 1) {
    const piece = cells[index]
    if (piece === null || piece.side !== side) {
      continue
    }
    const from = { row: Math.floor(index / cols), col: index % cols }
    for (const to of getPieceTargets(cells, rows, cols, from)) {
      const target = cells[indexOf(cols, to.row, to.col)]
      // 将帅不会被真正吃掉：可吃将说明对方已处死局，终局在上一手就已判定。
      if (target !== null && target.type === 'general') {
        continue
      }
      const next = moveOnCells(cells, cols, from, to)
      if (!isInCheck(next, rows, cols, side)) {
        moves.push({ from, to })
      }
    }
  }

  return moves
}

/** 只做几何移动，不校验合法性；合法性与终局判断在 applyAction 中完成。 */
function moveOnCells(
  cells: readonly (XiangqiPiece | null)[],
  cols: number,
  from: XiangqiCoord,
  to: XiangqiCoord,
): readonly (XiangqiPiece | null)[] {
  const next = cells.slice()
  const fromIndex = indexOf(cols, from.row, from.col)
  const toIndex = indexOf(cols, to.row, to.col)
  next[toIndex] = next[fromIndex] ?? null
  next[fromIndex] = null
  return next
}

export function applyMoveToCells(
  cells: readonly (XiangqiPiece | null)[],
  cols: number,
  from: XiangqiCoord,
  to: XiangqiCoord,
): XiangqiMoveResult {
  const moved = cells[indexOf(cols, from.row, from.col)]
  if (moved === null) {
    throw new Error(`起点没有棋子：(${from.row}, ${from.col})`)
  }
  const captured = cells[indexOf(cols, to.row, to.col)] ?? null
  const next = cells.slice()
  next[indexOf(cols, to.row, to.col)] = moved
  next[indexOf(cols, from.row, from.col)] = null
  return { cells: next, moved, captured }
}