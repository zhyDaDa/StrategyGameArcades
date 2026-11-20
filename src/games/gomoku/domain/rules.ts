import type { Transition } from '@/core/contracts/game'
import {
  GOMOKU_BOARD_SIZE,
  type GomokuAction,
  type GomokuCellValue,
  type GomokuCoord,
  type GomokuEvent,
  type GomokuSide,
  type GomokuState,
} from './types'

export function isGomokuSide(value: string): value is GomokuSide {
  return value === 'black' || value === 'white'
}

export function createInitialState(): GomokuState {
  return {
    size: GOMOKU_BOARD_SIZE,
    cells: Array<GomokuCellValue>(GOMOKU_BOARD_SIZE * GOMOKU_BOARD_SIZE).fill('empty'),
    status: 'playing',
    currentPlayer: 'black',
    winner: null,
    lastMove: null,
    moveCount: 0,
  }
}

export function opponentOf(side: GomokuSide): GomokuSide {
  return side === 'black' ? 'white' : 'black'
}

export function isInBounds(size: number, row: number, col: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size
}

export function indexOf(size: number, row: number, col: number): number {
  return row * size + col
}

export function isCellEmpty(
  cells: readonly GomokuCellValue[],
  size: number,
  row: number,
  col: number,
): boolean {
  return isInBounds(size, row, col) && cells[indexOf(size, row, col)] === 'empty'
}

export function listLegalActions(
  state: Readonly<GomokuState>,
  playerId: GomokuSide,
): readonly GomokuAction[] {
  if (state.status !== 'playing' || state.currentPlayer !== playerId) {
    return []
  }
  const actions: GomokuAction[] = []
  for (let row = 0; row < state.size; row += 1) {
    for (let col = 0; col < state.size; col += 1) {
      if (state.cells[indexOf(state.size, row, col)] === 'empty') {
        actions.push({ type: 'place', row, col })
      }
    }
  }
  actions.push({ type: 'resign' })
  return actions
}

/** 纯状态转换：假设收到已校验的行为，仍对关键约束做防御性保护。 */
export function applyAction(
  state: Readonly<GomokuState>,
  playerId: GomokuSide,
  action: GomokuAction,
): Transition<GomokuState, GomokuEvent> {
  if (state.status !== 'playing' || state.currentPlayer !== playerId) {
    throw new Error('非法状态：对局未进行或非当前玩家')
  }

  if (action.type === 'resign') {
    const winner = opponentOf(playerId)
    return {
      state: { ...state, currentPlayer: null, status: 'completed', winner },
      events: [{ type: 'game.finished', result: { outcome: 'win', winner } }],
    }
  }

  const { row, col } = action
  if (!isCellEmpty(state.cells, state.size, row, col)) {
    throw new Error('非法落子：目标位置非空')
  }

  const cells = placeDisc(state.cells, state.size, row, col, playerId)
  const lastMove: GomokuCoord = { row, col }
  const moveCount = state.moveCount + 1

  if (findWinningLine(cells, state.size, lastMove, playerId) !== null) {
    return {
      state: { ...state, cells, lastMove, moveCount, currentPlayer: null, status: 'completed', winner: playerId },
      events: [
        { type: 'piece.placed', playerId, row, col },
        { type: 'game.finished', result: { outcome: 'win', winner: playerId } },
      ],
    }
  }

  if (isBoardFull(cells)) {
    return {
      state: { ...state, cells, lastMove, moveCount, currentPlayer: null, status: 'completed', winner: null },
      events: [
        { type: 'piece.placed', playerId, row, col },
        { type: 'game.finished', result: { outcome: 'draw' } },
      ],
    }
  }

  return {
    state: { ...state, cells, lastMove, moveCount, currentPlayer: opponentOf(playerId) },
    events: [{ type: 'piece.placed', playerId, row, col }],
  }
}

function placeDisc(
  cells: readonly GomokuCellValue[],
  size: number,
  row: number,
  col: number,
  side: GomokuSide,
): readonly GomokuCellValue[] {
  const next = cells.slice()
  next[indexOf(size, row, col)] = side
  return next
}

function isBoardFull(cells: readonly GomokuCellValue[]): boolean {
  return cells.every((cell) => cell !== 'empty')
}

const AXES = [
  [
    { dr: 0, dc: 1 },
    { dr: 0, dc: -1 },
  ],
  [
    { dr: 1, dc: 0 },
    { dr: -1, dc: 0 },
  ],
  [
    { dr: 1, dc: 1 },
    { dr: -1, dc: -1 },
  ],
  [
    { dr: 1, dc: -1 },
    { dr: -1, dc: 1 },
  ],
] as const

/** 若最后落子在任一行（横/竖/两斜）连成 >=5 子，返回该连线的坐标，否则 null。 */
export function findWinningLine(
  cells: readonly GomokuCellValue[],
  size: number,
  last: GomokuCoord,
  side: GomokuSide,
): readonly GomokuCoord[] | null {
  for (const [forward, backward] of AXES) {
    const line = [
      ...collectRun(cells, size, last, side, backward).reverse(),
      last,
      ...collectRun(cells, size, last, side, forward),
    ]
    if (line.length >= 5) {
      return line
    }
  }
  return null
}

function collectRun(
  cells: readonly GomokuCellValue[],
  size: number,
  start: GomokuCoord,
  side: GomokuSide,
  dir: { readonly dr: number; readonly dc: number },
): GomokuCoord[] {
  const run: GomokuCoord[] = []
  let row = start.row + dir.dr
  let col = start.col + dir.dc
  while (isInBounds(size, row, col) && cells[indexOf(size, row, col)] === side) {
    run.push({ row, col })
    row += dir.dr
    col += dir.dc
  }
  return run
}