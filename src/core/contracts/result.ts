import type { PlayerId } from './player'

/**
 * 一局游戏的最终结果。初版只区分「胜负」与「平局」。
 * 具体结束原因（五连、认输、点数等）由各游戏的领域事件承载，不塞进核心结果。
 */
export type GameResult =
  | { readonly outcome: 'win'; readonly winner: PlayerId }
  | { readonly outcome: 'draw' }