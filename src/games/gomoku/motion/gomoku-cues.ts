import type { AnimationCue } from '@/presentation/motion/types'
import type { GomokuEvent } from '../domain/types'

/**
 * 领域事件 -> 该游戏的动效语义（纯函数）。cue id 使用
 * `transitionIndex:eventIndex`，确保同一事件不会因重渲染而重复播放。
 */
export function eventsToCues(events: readonly GomokuEvent[], transitionIndex: number): AnimationCue[] {
  return events.map((event, eventIndex): AnimationCue => {
    const id = `${transitionIndex}:${eventIndex}`
    if (event.type === 'piece.placed') {
      return { id, kind: 'piece.place', payload: { row: event.row, col: event.col } }
    }
    if (event.type === 'game.finished') {
      return { id, kind: 'game.finish' }
    }
    return { id, kind: event.type }
  })
}