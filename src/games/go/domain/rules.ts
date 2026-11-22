import type { Transition } from '@/core/contracts/game'
import {
  GO_BOARD_SIZE,
  GO_KOMI,
  type GoAction,
  type GoCellValue,
  type GoCoord,
  type GoEvent,
  type GoScore,
  type GoSide,
  type GoState,
} from './types'

const NEIGHBOR_OFFSETS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
] as const

export function isGoSide(value: string): value is GoSide {
  return value === 'black' || value === 'white'
}

export function opponentOf(side: GoSide): GoSide {
  return side === 'black' ? 'white' : 'black'
}

export function indexOf(size: number, row: number, col: number): number {
  return row * size + col
}

export function isInBounds(size: number, row: number, col: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size
}

export function neighbors(size: number, row: number, col: number): readonly GoCoord[] {
  const result: GoCoord[] = []
  for (const { dr, dc } of NEIGHBOR_OFFSETS) {
    const r = row + dr
    const c = col + dc
    if (isInBounds(size, r, c)) {
      result.push({ row: r, col: c })
    }
  }
  return result
}

export function createInitialState(): GoState {
  return {
    size: GO_BOARD_SIZE,
    cells: Array<GoCellValue>(GO_BOARD_SIZE * GO_BOARD_SIZE).fill('empty'),
    status: 'playing',
    currentPlayer: 'black',
    winner: null,
    endReason: null,
    lastMove: null,
    lastCaptured: [],
    consecutivePasses: 0,
    koPoint: null,
    captured: { black: 0, white: 0 },
    moveCount: 0,
    score: null,
  }
}

export interface GoGroup {
  readonly stones: readonly GoCoord[]
  readonly liberties: number
}

/** 同色连通块与它的气数；空位返回 null。 */
export function collectGroup(
  cells: readonly GoCellValue[],
  size: number,
  row: number,
  col: number,
): GoGroup | null {
  const value = cells[indexOf(size, row, col)]
  if (value === 'empty') {
    return null
  }

  const stones: GoCoord[] = []
  const liberties = new Set<number>()
  const visited = new Set<number>([indexOf(size, row, col)])
  const stack: GoCoord[] = [{ row, col }]

  while (stack.length > 0) {
    const current = stack.pop()
    if (current === undefined) {
      break
    }
    stones.push(current)
    for (const next of neighbors(size, current.row, current.col)) {
      const index = indexOf(size, next.row, next.col)
      const cell = cells[index]
      if (cell === 'empty') {
        liberties.add(index)
        continue
      }
      if (cell === value && !visited.has(index)) {
        visited.add(index)
        stack.push(next)
      }
    }
  }

  return { stones, liberties: liberties.size }
}

export interface GoPlayResult {
  readonly cells: readonly GoCellValue[]
  readonly captured: readonly GoCoord[]
  readonly ownLiberties: number
}

/**
 * 纯落子模拟：放子 -> 提掉无气的对方整块 -> 检查自杀。
 * 越界、占用或自杀返回 null，且不修改输入棋盘。
 */
export function playMove(
  cells: readonly GoCellValue[],
  size: number,
  row: number,
  col: number,
  side: GoSide,
): GoPlayResult | null {
  if (!isInBounds(size, row, col) || cells[indexOf(size, row, col)] !== 'empty') {
    return null
  }

  const next = cells.slice()
  next[indexOf(size, row, col)] = side
  const opponent = opponentOf(side)
  const captured: GoCoord[] = []
  const visited = new Set<number>()

  for (const neighbor of neighbors(size, row, col)) {
    const index = indexOf(size, neighbor.row, neighbor.col)
    if (next[index] !== opponent || visited.has(index)) {
      continue
    }
    const group = collectGroup(next, size, neighbor.row, neighbor.col)
    if (group === null) {
      continue
    }
    for (const stone of group.stones) {
      visited.add(indexOf(size, stone.row, stone.col))
    }
    if (group.liberties === 0) {
      captured.push(...group.stones)
    }
  }

  for (const stone of captured) {
    next[indexOf(size, stone.row, stone.col)] = 'empty'
  }

  const ownGroup = collectGroup(next, size, row, col)
  if (ownGroup === null || ownGroup.liberties === 0) {
    return null
  }

  return { cells: next, captured, ownLiberties: ownGroup.liberties }
}

export function isKoPoint(koPoint: GoCoord | null, row: number, col: number): boolean {
  return koPoint !== null && koPoint.row === row && koPoint.col === col
}

export function isLegalPlacement(
  cells: readonly GoCellValue[],
  size: number,
  row: number,
  col: number,
  side: GoSide,
  koPoint: GoCoord | null,
): boolean {
  if (isKoPoint(koPoint, row, col)) {
    return false
  }
  return playMove(cells, size, row, col, side) !== null
}

export function getLegalMoves(
  cells: readonly GoCellValue[],
  size: number,
  side: GoSide,
  koPoint: GoCoord | null,
): readonly GoCoord[] {
  const moves: GoCoord[] = []
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (isLegalPlacement(cells, size, row, col, side, koPoint)) {
        moves.push({ row, col })
      }
    }
  }
  return moves
}

export function listLegalActions(
  state: Readonly<GoState>,
  playerId: GoSide,
): readonly GoAction[] {
  if (state.status !== 'playing' || state.currentPlayer !== playerId) {
    return []
  }
  const actions: GoAction[] = getLegalMoves(
    state.cells,
    state.size,
    playerId,
    state.koPoint,
  ).map(({ row, col }) => ({ type: 'place', row, col }))
  actions.push({ type: 'pass' }, { type: 'resign' })
  return actions
}

/**
 * 简单劫：提掉恰好一子、且落子后自身整块只剩一口气时，
 * 被提掉的点就是对方不能立即回提的劫点。
 */
function computeKoPoint(
  play: GoPlayResult,
  size: number,
): GoCoord | null {
  if (play.captured.length !== 1 || play.ownLiberties !== 1) {
    return null
  }
  const captured = play.captured[0]
  if (!isInBounds(size, captured.row, captured.col)) {
    return null
  }
  return captured
}

/** 中国规则数子：棋子 + 仅被单方围住的空点；白方加贴目。 */
export function scoreBoard(
  cells: readonly GoCellValue[],
  size: number,
  komi: number = GO_KOMI,
): GoScore {
  let black = 0
  let white = 0
  const visited = new Set<number>()

  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index]
    if (cell === 'black') {
      black += 1
      continue
    }
    if (cell === 'white') {
      white += 1
      continue
    }
    if (visited.has(index)) {
      continue
    }

    const region: number[] = []
    const borders = new Set<GoSide>()
    const stack = [index]
    visited.add(index)

    while (stack.length > 0) {
      const current = stack.pop()
      if (current === undefined) {
        break
      }
      region.push(current)
      const row = Math.floor(current / size)
      const col = current % size
      for (const neighbor of neighbors(size, row, col)) {
        const neighborIndex = indexOf(size, neighbor.row, neighbor.col)
        const neighborCell = cells[neighborIndex]
        if (neighborCell === 'empty') {
          if (!visited.has(neighborIndex)) {
            visited.add(neighborIndex)
            stack.push(neighborIndex)
          }
        } else {
          borders.add(neighborCell)
        }
      }
    }

    if (borders.size === 1) {
      if (borders.has('black')) {
        black += region.length
      } else {
        white += region.length
      }
    }
  }

  return { black, white: white + komi, komi }
}

export function winnerFromScore(score: GoScore): GoSide | null {
  if (score.black > score.white) {
    return 'black'
  }
  if (score.white > score.black) {
    return 'white'
  }
  return null
}

/** 纯状态转换：假设收到已校验的行为，仍对关键约束做防御性保护。 */
export function applyAction(
  state: Readonly<GoState>,
  playerId: GoSide,
  action: GoAction,
): Transition<GoState, GoEvent> {
  if (state.status !== 'playing' || state.currentPlayer !== playerId) {
    throw new Error('非法状态：对局未进行或非当前玩家')
  }

  if (action.type === 'resign') {
    const winner = opponentOf(playerId)
    return {
      state: {
        ...state,
        status: 'completed',
        currentPlayer: null,
        winner,
        endReason: 'resign',
        koPoint: null,
      },
      events: [
        {
          type: 'game.finished',
          result: { outcome: 'win', winner },
          reason: 'resign',
          score: null,
        },
      ],
    }
  }

  if (action.type === 'pass') {
    const consecutivePasses = state.consecutivePasses + 1
    const events: GoEvent[] = [{ type: 'turn.passed', playerId }]

    if (consecutivePasses >= 2) {
      const score = scoreBoard(state.cells, state.size)
      const winner = winnerFromScore(score)
      return {
        state: {
          ...state,
          status: 'completed',
          currentPlayer: null,
          winner,
          endReason: 'two-passes',
          lastMove: null,
          lastCaptured: [],
          consecutivePasses,
          koPoint: null,
          score,
          moveCount: state.moveCount + 1,
        },
        events: [
          ...events,
          {
            type: 'game.finished',
            result: winner !== null ? { outcome: 'win', winner } : { outcome: 'draw' },
            reason: 'two-passes',
            score,
          },
        ],
      }
    }

    return {
      state: {
        ...state,
        currentPlayer: opponentOf(playerId),
        lastMove: null,
        lastCaptured: [],
        consecutivePasses,
        koPoint: null,
        moveCount: state.moveCount + 1,
      },
      events,
    }
  }

  const { row, col } = action
  if (!isInBounds(state.size, row, col) || state.cells[indexOf(state.size, row, col)] !== 'empty') {
    throw new Error('非法落子：目标位置不是空点')
  }
  if (isKoPoint(state.koPoint, row, col)) {
    throw new Error('非法落子：不能立即回提形成劫争')
  }

  const play = playMove(state.cells, state.size, row, col, playerId)
  if (play === null) {
    throw new Error('非法落子：该点会形成自杀')
  }

  const capturedCount = play.captured.length
  const captured = {
    black: state.captured.black + (playerId === 'black' ? capturedCount : 0),
    white: state.captured.white + (playerId === 'white' ? capturedCount : 0),
  }

  return {
    state: {
      ...state,
      cells: play.cells,
      currentPlayer: opponentOf(playerId),
      lastMove: { row, col },
      lastCaptured: play.captured,
      consecutivePasses: 0,
      koPoint: computeKoPoint(play, state.size),
      captured,
      moveCount: state.moveCount + 1,
    },
    events: [
      {
        type: 'stone.placed',
        playerId,
        row,
        col,
        captured: play.captured,
      },
    ],
  }
}