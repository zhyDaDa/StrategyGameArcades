import type { AnimationCue } from '@/presentation/motion/types'
import type { ReversiEvent } from '../domain/types'

/**
 * 领域事件 -> 该游戏的动效语义（纯函数）。cue id 使用
 * `transitionIndex:eventIndex`，确保同一事件不会因重渲染而重复播放。
 */
export function eventsToCues(events: readonly ReversiEvent[], transitionIndex: number): AnimationCue[] {
  return events.map((event, eventIndex): AnimationCue => {
    const id = `${transitionIndex}:${eventIndex}`
    if (event.type === 'piece.placed') {
      return {
        id,
        kind: 'piece.place',
        payload: {
          row: event.row,
          col: event.col,
          playerId: event.playerId,
          flipped: event.flipped.length,
        },
      }
    }
    if (event.type === 'turn.passed') {
      return { id, kind: 'turn.pass', payload: { playerId: event.playerId } }
    }
    return { id, kind: 'game.finish', payload: { result: event.result } }
  })
}