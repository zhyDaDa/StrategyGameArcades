/**
 * 席位的接入方式：真人、内置算法、云端大模型、本地小模型。
 * 四种方式分别对应四个标准主题色，是「统一游戏接口」的产品核心。
 */
export const SEAT_TYPES = ['human', 'algorithm', 'llm', 'local'] as const
export type SeatType = (typeof SEAT_TYPES)[number]

export interface SeatAssignment<S extends string> {
  readonly id: S
  readonly type: SeatType
  /** 真人玩家的显示名称；非人类席位不使用。 */
  readonly name?: string
}

/**
 * 对局席位配置：任意席位都可以独立选择接入方式。
 * 全部席位都不是真人即「自动对弈」；此时没有本机操作者，`youSeat` 为 null。
 */
export interface SeatMatchConfig<S extends string> {
  /** 按本局席位顺序排列；双人游戏固定两个席位。 */
  readonly seats: readonly SeatAssignment<S>[]
  /** 本机操作者（房主）所在的真人席位；没有真人席位时为 null。 */
  readonly youSeat: S | null
}