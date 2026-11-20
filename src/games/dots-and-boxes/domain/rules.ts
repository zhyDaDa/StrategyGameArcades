import type { Transition } from '@/core/contracts/game'
import {
  DOTS_AND_BOXES_SEATS,
  type DotsAndBoxesAction,
  type DotsAndBoxesEvent,
  type DotsAndBoxesSeat,
  type DotsAndBoxesState,
  type DotsBox,
  type DotsEdge,
} from './types'

/** 规则函数只需要局面里与边、格相关的部分；AI 的 Observation 也满足这个结构。 */
export interface DotsEdgeBoard {
  readonly boxSize: number
  readonly horizontalEdges: readonly (DotsAndBoxesSeat | null)[]
  readonly verticalEdges: readonly (DotsAndBoxesSeat | null)[]
  readonly boxes: readonly (DotsAndBoxesSeat | null)[]
}

export interface DotsInitialOptions {
  readonly boxSize: number
  readonly players: readonly DotsAndBoxesSeat[]
  readonly firstPlayer: DotsAndBoxesSeat
}

export function isDotsAndBoxesSeat(value: string): value is DotsAndBoxesSeat {
  return (DOTS_AND_BOXES_SEATS as readonly string[]).includes(value)
}

export function isDotsBoardSize(value: number): boolean {
  return value === 8 || value === 12 || value === 15 || value === 18
}

export function horizontalEdgeIndex(boxSize: number, row: number, col: number): number {
  return row * boxSize + col
}

export function verticalEdgeIndex(boxSize: number, row: number, col: number): number {
  return row * (boxSize + 1) + col
}

export function boxIndex(boxSize: number, row: number, col: number): number {
  return row * boxSize + col
}

export function horizontalEdgeCount(boxSize: number): number {
  return (boxSize + 1) * boxSize
}

export function verticalEdgeCount(boxSize: number): number {
  return boxSize * (boxSize + 1)
}

export function boxCount(boxSize: number): number {
  return boxSize * boxSize
}

export function isEdgeInBounds(boxSize: number, edge: DotsEdge): boolean {
  if (edge.orientation === 'horizontal') {
    return edge.row >= 0 && edge.row <= boxSize && edge.col >= 0 && edge.col < boxSize
  }
  return edge.row >= 0 && edge.row < boxSize && edge.col >= 0 && edge.col <= boxSize
}

export function edgeOwner(board: DotsEdgeBoard, edge: DotsEdge): DotsAndBoxesSeat | null {
  if (!isEdgeInBounds(board.boxSize, edge)) {
    throw new Error(`边超出棋盘范围：${edge.orientation} (${edge.row}, ${edge.col})`)
  }
  const index =
    edge.orientation === 'horizontal'
      ? horizontalEdgeIndex(board.boxSize, edge.row, edge.col)
      : verticalEdgeIndex(board.boxSize, edge.row, edge.col)
  const owner = edge.orientation === 'horizontal' ? board.horizontalEdges[index] : board.verticalEdges[index]
  return owner ?? null
}

export function boxOwner(board: DotsEdgeBoard, box: DotsBox): DotsAndBoxesSeat | null {
  return board.boxes[boxIndex(board.boxSize, box.row, box.col)] ?? null
}

/** 与该边相邻最多两个方格；横边取上下，竖边取左右。 */
export function adjacentBoxesOfEdge(boxSize: number, edge: DotsEdge): readonly DotsBox[] {
  const boxes: DotsBox[] = []
  if (edge.orientation === 'horizontal') {
    if (edge.row > 0) boxes.push({ row: edge.row - 1, col: edge.col })
    if (edge.row < boxSize) boxes.push({ row: edge.row, col: edge.col })
  } else {
    if (edge.col > 0) boxes.push({ row: edge.row, col: edge.col - 1 })
    if (edge.col < boxSize) boxes.push({ row: edge.row, col: edge.col })
  }
  return boxes
}

export function countBoxEdges(board: DotsEdgeBoard, box: DotsBox): number {
  const { boxSize } = board
  const edges: readonly DotsEdge[] = [
    { orientation: 'horizontal', row: box.row, col: box.col },
    { orientation: 'horizontal', row: box.row + 1, col: box.col },
    { orientation: 'vertical', row: box.row, col: box.col },
    { orientation: 'vertical', row: box.row, col: box.col + 1 },
  ]
  return edges.filter((edge) => edgeOwner(board, edge) !== null).length
}

/** 假设这根尚未画的边被画上后，会立刻完成哪些尚未归属的方格。 */
export function completedBoxesIfDrawn(board: DotsEdgeBoard, edge: DotsEdge): readonly DotsBox[] {
  if (edgeOwner(board, edge) !== null) {
    return []
  }
  return adjacentBoxesOfEdge(board.boxSize, edge).filter(
    (box) => boxOwner(board, box) === null && countBoxEdges(board, box) === 3,
  )
}

export function createInitialState(options: DotsInitialOptions): DotsAndBoxesState {
  const { boxSize, players, firstPlayer } = options
  if (!isDotsBoardSize(boxSize)) {
    throw new Error(`不支持的棋盘尺寸：${boxSize}`)
  }
  if (players.length < 2 || players.length > DOTS_AND_BOXES_SEATS.length) {
    throw new Error(`玩家人数必须在 2-${DOTS_AND_BOXES_SEATS.length} 之间，收到 ${players.length}`)
  }
  players.forEach((seat, index) => {
    if (seat !== DOTS_AND_BOXES_SEATS[index]) {
      throw new Error(`席位必须按 ${DOTS_AND_BOXES_SEATS.join(' / ')} 的顺序取前缀，收到 ${players.join(' / ')}`)
    }
  })
  if (!players.includes(firstPlayer)) {
    throw new Error(`先手 ${firstPlayer} 不在本局玩家中`)
  }

  return {
    boxSize,
    players,
    horizontalEdges: Array<DotsAndBoxesSeat | null>(horizontalEdgeCount(boxSize)).fill(null),
    verticalEdges: Array<DotsAndBoxesSeat | null>(verticalEdgeCount(boxSize)).fill(null),
    boxes: Array<DotsAndBoxesSeat | null>(boxCount(boxSize)).fill(null),
    currentPlayer: firstPlayer,
    status: 'playing',
    winner: null,
    lastEdge: null,
    moveCount: 0,
  }
}

export function nextPlayer(
  players: readonly DotsAndBoxesSeat[],
  current: DotsAndBoxesSeat,
): DotsAndBoxesSeat {
  const index = players.indexOf(current)
  if (index < 0) {
    throw new Error(`当前玩家 ${current} 不在本局玩家中`)
  }
  return players[(index + 1) % players.length]
}

export function listLegalActions(
  state: Readonly<DotsAndBoxesState>,
  playerId: DotsAndBoxesSeat,
): readonly DotsAndBoxesAction[] {
  if (state.status !== 'playing' || state.currentPlayer !== playerId) {
    return []
  }

  const { boxSize } = state
  const actions: DotsAndBoxesAction[] = []

  for (let row = 0; row <= boxSize; row += 1) {
    for (let col = 0; col < boxSize; col += 1) {
      if (state.horizontalEdges[horizontalEdgeIndex(boxSize, row, col)] === null) {
        actions.push({ type: 'draw-edge', orientation: 'horizontal', row, col })
      }
    }
  }
  for (let row = 0; row < boxSize; row += 1) {
    for (let col = 0; col <= boxSize; col += 1) {
      if (state.verticalEdges[verticalEdgeIndex(boxSize, row, col)] === null) {
        actions.push({ type: 'draw-edge', orientation: 'vertical', row, col })
      }
    }
  }

  return actions
}

/** 纯状态转换：假设收到已校验的行为，仍对关键约束做防御性保护。 */
export function applyAction(
  state: Readonly<DotsAndBoxesState>,
  playerId: DotsAndBoxesSeat,
  action: DotsAndBoxesAction,
): Transition<DotsAndBoxesState, DotsAndBoxesEvent> {
  if (state.status !== 'playing' || state.currentPlayer !== playerId) {
    throw new Error('非法状态：对局未进行或非当前玩家')
  }

  const edge: DotsEdge = { orientation: action.orientation, row: action.row, col: action.col }
  if (!isEdgeInBounds(state.boxSize, edge)) {
    throw new Error(`非法连线：边超出棋盘范围 ${action.orientation} (${action.row}, ${action.col})`)
  }
  if (edgeOwner(state, edge) !== null) {
    throw new Error('非法连线：这两点之间已经有线')
  }

  const completed = completedBoxesIfDrawn(state, edge)
  const horizontalEdges = state.horizontalEdges.slice()
  const verticalEdges = state.verticalEdges.slice()
  if (edge.orientation === 'horizontal') {
    horizontalEdges[horizontalEdgeIndex(state.boxSize, edge.row, edge.col)] = playerId
  } else {
    verticalEdges[verticalEdgeIndex(state.boxSize, edge.row, edge.col)] = playerId
  }

  const boxes = state.boxes.slice()
  for (const box of completed) {
    boxes[boxIndex(state.boxSize, box.row, box.col)] = playerId
  }

  const events: DotsAndBoxesEvent[] = [
    { type: 'edge.drawn', playerId, edge },
    ...completed.map(
      (box): DotsAndBoxesEvent => ({ type: 'box.claimed', playerId, box }),
    ),
  ]

  const moveCount = state.moveCount + 1
  const finished = boxes.every((owner) => owner !== null)

  if (finished) {
    const winner = findUniqueLeader(state.players, boxes)
    const result = winner === null ? { outcome: 'draw' as const } : { outcome: 'win' as const, winner }
    events.push({ type: 'game.finished', result })
    return {
      state: {
        ...state,
        horizontalEdges,
        verticalEdges,
        boxes,
        currentPlayer: null,
        status: 'completed',
        winner,
        lastEdge: edge,
        moveCount,
      },
      events,
    }
  }

  return {
    state: {
      ...state,
      horizontalEdges,
      verticalEdges,
      boxes,
      currentPlayer: completed.length > 0 ? playerId : nextPlayer(state.players, playerId),
      lastEdge: edge,
      moveCount,
    },
    events,
  }
}

export function countScores(
  players: readonly DotsAndBoxesSeat[],
  boxes: readonly (DotsAndBoxesSeat | null)[],
): Record<DotsAndBoxesSeat, number> {
  const scores: Record<DotsAndBoxesSeat, number> = { red: 0, blue: 0, green: 0, yellow: 0 }
  for (const seat of players) {
    scores[seat] = 0
  }
  for (const owner of boxes) {
    if (owner !== null) {
      scores[owner] += 1
    }
  }
  return scores
}

/** 唯一最高分者才算获胜；并列最高返回 null（平局）。 */
export function findUniqueLeader(
  players: readonly DotsAndBoxesSeat[],
  boxes: readonly (DotsAndBoxesSeat | null)[],
): DotsAndBoxesSeat | null {
  const scores = countScores(players, boxes)
  let leader: DotsAndBoxesSeat | null = null
  let best = -1
  let tied = false

  for (const seat of players) {
    const score = scores[seat]
    if (score > best) {
      best = score
      leader = seat
      tied = false
    } else if (score === best) {
      tied = true
    }
  }

  return tied ? null : leader
}