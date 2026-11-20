import type { GameDefinition } from '../contracts/game'
import type { ActionRecord } from './action-record'

/**
 * 纯函数重放：给定规则与行为序列，从初始状态重放得到最终状态。
 * 用于验证「同一起点 + 相同行为序列 => 相同结果」的确定性。
 */
export function replayGame<S, A, O, E>(
  game: GameDefinition<S, A, O, E>,
  records: readonly ActionRecord<A>[],
): S {
  let state = game.createInitialState()
  for (const record of records) {
    state = game.reduce(state, record.playerId, record.action).state
  }
  return state
}