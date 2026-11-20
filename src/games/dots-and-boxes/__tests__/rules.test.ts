import { describe, expect, it } from 'vitest'
import {
  applyAction,
  boxIndex,
  createInitialState,
  findUniqueLeader,
  horizontalEdgeIndex,
} from '../domain/rules'
import type {
  DotsAndBoxesAction,
  DotsAndBoxesSeat,
  DotsAndBoxesState,
} from '../domain/types'

const TWO_PLAYER_OPTIONS = {
  boxSize: 8,
  players: ['red', 'blue'] as const,
  firstPlayer: 'red' as const,
}

function play(
  options: {
    readonly boxSize: number
    readonly players: readonly DotsAndBoxesSeat[]
    readonly firstPlayer: DotsAndBoxesSeat
  },
  moves: ReadonlyArray<readonly [DotsAndBoxesSeat, DotsAndBoxesAction]>,
): DotsAndBoxesState {
  let state = createInitialState(options)
  for (const [seat, action] of moves) {
    state = applyAction(state, seat, action).state
  }
  return state
}

describe('方格大战规则', () => {
  it('初始状态：红方先手，合法动作覆盖全部未画的边', () => {
    const state = createInitialState(TWO_PLAYER_OPTIONS)
    expect(state.currentPlayer).toBe('red')
    expect(state.horizontalEdges).toHaveLength(8 * 9)
    expect(state.verticalEdges).toHaveLength(9 * 8)
    expect(state.boxes).toHaveLength(64)
    expect(state.boxes.every((owner) => owner === null)).toBe(true)
  })

  it('普通连线后轮到下一位玩家', () => {
    const state = play(TWO_PLAYER_OPTIONS, [
      ['red', { type: 'draw-edge', orientation: 'horizontal', row: 0, col: 0 }],
    ])
    expect(state.currentPlayer).toBe('blue')
    expect(state.lastEdge).toEqual({ orientation: 'horizontal', row: 0, col: 0 })
    expect(state.moveCount).toBe(1)
  })

  it('围成一个方格得 1 分并继续行动', () => {
    const state = play(TWO_PLAYER_OPTIONS, [
      ['red', { type: 'draw-edge', orientation: 'horizontal', row: 0, col: 0 }],
      ['blue', { type: 'draw-edge', orientation: 'vertical', row: 0, col: 0 }],
      ['red', { type: 'draw-edge', orientation: 'vertical', row: 0, col: 1 }],
      ['blue', { type: 'draw-edge', orientation: 'horizontal', row: 1, col: 0 }],
    ])
    expect(state.boxes[boxIndex(state.boxSize, 0, 0)]).toBe('blue')
    expect(state.currentPlayer).toBe('blue')
  })

  it('一根线同时围成两个方格时两个都归当前玩家', () => {
    const transition = play(TWO_PLAYER_OPTIONS, [
      ['red', { type: 'draw-edge', orientation: 'horizontal', row: 0, col: 0 }],
      ['blue', { type: 'draw-edge', orientation: 'horizontal', row: 0, col: 1 }],
      ['red', { type: 'draw-edge', orientation: 'horizontal', row: 1, col: 0 }],
      ['blue', { type: 'draw-edge', orientation: 'horizontal', row: 1, col: 1 }],
      ['red', { type: 'draw-edge', orientation: 'vertical', row: 0, col: 0 }],
      ['blue', { type: 'draw-edge', orientation: 'vertical', row: 0, col: 2 }],
      ['red', { type: 'draw-edge', orientation: 'vertical', row: 0, col: 1 }],
    ])
    expect(transition.boxes[boxIndex(8, 0, 0)]).toBe('red')
    expect(transition.boxes[boxIndex(8, 0, 1)]).toBe('red')
    expect(transition.currentPlayer).toBe('red')
  })

  it('三人局按席位顺序轮转，得分后仍是同一玩家', () => {
    const options = {
      boxSize: 8,
      players: ['red', 'blue', 'green'] as const,
      firstPlayer: 'red' as const,
    }
    let state = play(options, [
      ['red', { type: 'draw-edge', orientation: 'horizontal', row: 0, col: 0 }],
      ['blue', { type: 'draw-edge', orientation: 'horizontal', row: 2, col: 0 }],
    ])
    expect(state.currentPlayer).toBe('green')

    state = play(options, [
      ['red', { type: 'draw-edge', orientation: 'horizontal', row: 0, col: 0 }],
      ['blue', { type: 'draw-edge', orientation: 'vertical', row: 0, col: 0 }],
      ['green', { type: 'draw-edge', orientation: 'vertical', row: 0, col: 1 }],
      ['red', { type: 'draw-edge', orientation: 'horizontal', row: 1, col: 0 }],
    ])
    expect(state.boxes[boxIndex(8, 0, 0)]).toBe('red')
    expect(state.currentPlayer).toBe('red')
  })

  it('重复画同一条边或非当前玩家行动会抛错', () => {
    const state = play(TWO_PLAYER_OPTIONS, [
      ['red', { type: 'draw-edge', orientation: 'horizontal', row: 0, col: 0 }],
    ])
    expect(() =>
      applyAction(state, 'blue', { type: 'draw-edge', orientation: 'horizontal', row: 0, col: 0 }),
    ).toThrow()
    expect(() =>
      applyAction(state, 'red', { type: 'draw-edge', orientation: 'horizontal', row: 0, col: 1 }),
    ).toThrow()
  })

  it('所有方格被占满时结束，唯一最高分获胜', () => {
    const base = createInitialState(TWO_PLAYER_OPTIONS)
    const size = base.boxSize
    const horizontalEdges: (DotsAndBoxesSeat | null)[] = base.horizontalEdges.map(() => 'red')
    horizontalEdges[horizontalEdgeIndex(size, size, size - 1)] = null
    const verticalEdges = base.verticalEdges.map(() => 'red' as const)
    const boxes: (DotsAndBoxesSeat | null)[] = base.boxes.map(() => 'red')
    boxes[boxIndex(size, size - 1, size - 1)] = null

    const state: DotsAndBoxesState = {
      ...base,
      horizontalEdges,
      verticalEdges,
      boxes,
      currentPlayer: 'blue',
      moveCount: 200,
    }

    const transition = applyAction(state, 'blue', {
      type: 'draw-edge',
      orientation: 'horizontal',
      row: size,
      col: size - 1,
    })

    expect(transition.state.status).toBe('completed')
    expect(transition.state.currentPlayer).toBeNull()
    expect(transition.state.winner).toBe('red')
    expect(transition.events.map((event) => event.type)).toEqual([
      'edge.drawn',
      'box.claimed',
      'game.finished',
    ])
  })

  it('最高分并列时判平局', () => {
    const base = createInitialState(TWO_PLAYER_OPTIONS)
    const size = base.boxSize
    const horizontalEdges = base.horizontalEdges.map(() => 'red' as const)
    horizontalEdges[horizontalEdgeIndex(size, size, size - 1)] = null
    const verticalEdges = base.verticalEdges.map(() => 'red' as const)
    const boxes = base.boxes.map((_, index) =>
      index === size * size - 1 ? null : index % 2 === 0 ? ('blue' as const) : ('red' as const),
    )

    const state: DotsAndBoxesState = {
      ...base,
      horizontalEdges,
      verticalEdges,
      boxes,
      currentPlayer: 'red',
      moveCount: 200,
    }

    const transition = applyAction(state, 'red', {
      type: 'draw-edge',
      orientation: 'horizontal',
      row: size,
      col: size - 1,
    })

    expect(transition.state.status).toBe('completed')
    expect(transition.state.winner).toBeNull()
    expect(transition.state.boxes.filter((owner) => owner === 'red')).toHaveLength(32)
    expect(transition.state.boxes.filter((owner) => owner === 'blue')).toHaveLength(32)
  })

  it('findUniqueLeader 识别唯一最高分与并列', () => {
    const boxes = Array<DotsAndBoxesSeat | null>(4).fill(null)
    boxes[0] = 'red'
    boxes[1] = 'red'
    boxes[2] = 'blue'
    expect(findUniqueLeader(['red', 'blue'], boxes)).toBe('red')

    boxes[3] = 'blue'
    expect(findUniqueLeader(['red', 'blue'], boxes)).toBeNull()
  })
})