import type { Transition } from '@/core/contracts/game'
import {
  REVERSI_BOARD_SIZE,
  type ReversiAction,
  type ReversiCellValue,
  type ReversiCoord,
  type ReversiEvent,
  type ReversiSide,
  type ReversiState,
} from './types'

const DIRECTIONS = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 0 },
  { dr: -1, dc: 1 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
] as const

export function isReversiSide(value: string): value is ReversiSide {
  return value === 'black' || value === 'white'
}

export function createInitialState(): ReversiState {
  const cells = Array<ReversiCellValue>(REVERSI_BOARD_SIZE * REVERSI_BOARD_SIZE).fill('empty')
  cells[indexOf(REVERSI_BOARD_SIZE, 3, 3)] = 'white'
  cells[indexOf(REVERSI_BOARD_SIZE, 4, 4)] = 'white'
  cells[indexOf(REVERSI_BOARD_SIZE, 3, 4)] = 'black'
  cells[indexOf(REVERSI_BOARD_SIZE, 4, 3)] = 'black'
  return {
    size: REVERSI_BOARD_SIZE,
    cells,
    status: 'playing',
    currentPlayer: 'black',
    winner: null,
    lastMove: null,
    moveCount: 0,
  }
}

export function opponentOf(side: ReversiSide): ReversiSide {
  return side === 'black' ? 'white' : 'black'
}

export function indexOf(size: number, row: number, col: number): number {
  return row * size + col
}

function inBounds(size: number, row: number, col: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size
}

/** 计算在 (row,col) 落 side 会翻转的所有对手棋子；不构成夹击则返回空数组。 */
export function findFlips(
  cells: readonly ReversiCellValue[],
  size: number,
  row: number,
  col: number,
  side: ReversiSide,
): readonly ReversiCoord[] {
  const opponent = opponentOf(side)
  const flips: ReversiCoord[] = []
  for (const dir of DIRECTIONS) {
    const line: ReversiCoord[] = []
    let r = row + dir.dr
    let c = col + dir.dc
    while (inBounds(size, r, c) && cells[indexOf(size, r, c)] === opponent) {
      line.push({ row: r, col: c })
      r += dir.dr
      c += dir.dc
    }
    if (line.length > 0 && inBounds(size, r, c) && cells[indexOf(size, r, c)] === side) {
      flips.push(...line)
    }
  }
  return flips
}

export function isLegalMove(
  cells: readonly ReversiCellValue[],
  size: number,
  row: number,
  col: number,
  side: ReversiSide,
): boolean {
  return (
    inBounds(size, row, col) &&
    cells[indexOf(size, row, col)] === 'empty' &&
    findFlips(cells, size, row, col, side).length > 0
  )
}

export function getLegalMoves(
  cells: readonly ReversiCellValue[],
  size: number,
  side: ReversiSide,
): readonly ReversiCoord[] {
  const moves: ReversiCoord[] = []
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (isLegalMove(cells, size, row, col, side)) {
        moves.push({ row, col })
      }
    }
  }
  return moves
}

export function listLegalActions(
  state: Readonly<ReversiState>,
  playerId: ReversiSide,
): readonly ReversiAction[] {
  if (state.status !== 'playing' || state.currentPlayer !== playerId) {
    return []
  }
  return getLegalMoves(state.cells, state.size, playerId).map(({ row, col }) => ({
    type: 'place',
    row,
    col,
  }))
}

/**
 * 纯状态转换。合法落子后自动处理「无子可下的一方自动跳过」：
 * 黑白棋只能在下子与被迫跳步之间交替，因此这里把被迫跳步折叠进同一次 transition，
 * 控制器只需产出 'place' 动作，无需感知跳步。
 */
export function applyAction(
  state: Readonly<ReversiState>,
  playerId: ReversiSide,
  action: ReversiAction,
): Transition<ReversiState, ReversiEvent> {
  if (state.status !== 'playing' || state.currentPlayer !== playerId) {
    throw new Error('非法状态：对局未进行或非当前玩家')
  }
  const { row, col } = action
  const flipped = findFlips(state.cells, state.size, row, col, playerId)
  if (flipped.length === 0) {
    throw new Error('非法落子：该位置不能形成夹击')
  }

  let cells = applyPlace(state.cells, state.size, row, col, playerId, flipped)
  const lastMove = { row, col, flipped }
  const events: ReversiEvent[] = [{ type: 'piece.placed', playerId, row, col, flipped }]
  let currentPlayer = opponentOf(playerId)
  let passes = 0

  while (getLegalMoves(cells, state.size, currentPlayer).length === 0) {
    passes += 1
    events.push({ type: 'turn.passed', playerId: currentPlayer })
    if (passes >= 2) {
      const winner = countWinner(cells)
      return {
        state: {
          ...state,
          cells,
          status: 'completed',
          currentPlayer: null,
          winner,
          lastMove,
          moveCount: state.moveCount + 1,
        },
        events: [
          ...events,
          { type: 'game.finished', result: winner !== null ? { outcome: 'win', winner } : { outcome: 'draw' } },
        ],
      }
    }
    currentPlayer = opponentOf(currentPlayer)
  }

  return {
    state: {
      ...state,
      cells,
      status: 'playing',
      currentPlayer,
      winner: null,
      lastMove,
      moveCount: state.moveCount + 1,
    },
    events,
  }
}

function applyPlace(
  cells: readonly ReversiCellValue[],
  size: number,
  row: number,
  col: number,
  side: ReversiSide,
  flipped: readonly ReversiCoord[],
): readonly ReversiCellValue[] {
  const next = cells.slice()
  next[indexOf(size, row, col)] = side
  for (const coord of flipped) {
    next[indexOf(size, coord.row, coord.col)] = side
  }
  return next
}

export function countWinner(cells: readonly ReversiCellValue[]): ReversiSide | null {
  let black = 0
  let white = 0
  for (const cell of cells) {
    if (cell === 'black') {
      black += 1
    } else if (cell === 'white') {
      white += 1
    }
  }
  if (black > white) {
    return 'black'
  }
  if (white > black) {
    return 'white'
  }
  return null
}