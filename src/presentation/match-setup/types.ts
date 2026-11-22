/** 席位的控制者类型：真人玩家或 AI。所有游戏共用同一套席位语义。 */
export const SEAT_TYPES = ['human', 'ai'] as const
export type SeatType = (typeof SEAT_TYPES)[number]

export interface SeatAssignment<S extends string> {
  readonly id: S
  readonly type: SeatType
}

/**
 * 对局席位配置：任意席位都可以独立设为真人或 AI。
 * 全部席位都是 AI 即「AI 对 AI」；此时没有本机操作者，`youSeat` 为 null。
 */
export interface SeatMatchConfig<S extends string> {
  /** 按本局席位顺序排列；双人游戏固定两个席位。 */
  readonly seats: readonly SeatAssignment<S>[]
  /** 本机操作者所在的真人席位；没有真人席位时为 null。 */
  readonly youSeat: S | null
}