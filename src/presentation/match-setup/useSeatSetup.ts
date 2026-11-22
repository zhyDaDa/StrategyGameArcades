import { useMemo, useState } from 'react'
import { applySidePreset, resolveYouSeat } from './seats'
import type { SeatAssignment, SeatType } from './types'

export interface UseSeatSetupParams<S extends string> {
  /** 本局全部席位；多席位游戏可以一次管理所有颜色。 */
  readonly seatIds: readonly S[]
  /** 默认坐在第一位的真人席位。 */
  readonly defaultHumanSeat: S
  /** 当前启用的席位；人数变化时用它校正「你的席位」。 */
  readonly activeSeatIds?: readonly S[]
}

export interface UseSeatSetupResult<S extends string> {
  readonly seats: readonly SeatAssignment<S>[]
  readonly youSeat: S | null
  /** 只改单个席位的真人 / AI；允许全部改为 AI。 */
  readonly setSeatType: (id: S, type: SeatType) => void
  /** 在现有真人席位中选择本机操作者。 */
  readonly setYouSeat: (id: S) => void
  /** 快速执子：所选席位为真人，其余为 AI。 */
  readonly applyYourSide: (choice: S | 'random') => void
}

/**
 * 配置页的席位状态。真人席位与「你的席位」分离：
 * 前者决定谁在行动，后者只标记本机操作者，因此 AI 对 AI 时 `youSeat` 为 null。
 */
export function useSeatSetup<S extends string>({
  seatIds,
  defaultHumanSeat,
  activeSeatIds = seatIds,
}: UseSeatSetupParams<S>): UseSeatSetupResult<S> {
  const [seats, setSeats] = useState<readonly SeatAssignment<S>[]>(() =>
    seatIds.map((id) => ({ id, type: id === defaultHumanSeat ? 'human' : 'ai' })),
  )
  const [preferredYouSeat, setPreferredYouSeat] = useState<S | null>(defaultHumanSeat)

  const activeSet = useMemo(() => new Set(activeSeatIds), [activeSeatIds])
  const youSeat = resolveYouSeat(seats, preferredYouSeat, activeSet)

  function setSeatType(id: S, type: SeatType) {
    setSeats((current) => current.map((seat) => (seat.id === id ? { ...seat, type } : seat)))
    // 从「全 AI」恢复出第一位真人时，直接把它作为本机操作者，避免沿用旧席位。
    if (type === 'human' && youSeat === null) {
      setPreferredYouSeat(id)
    }
  }

  function setYouSeat(id: S) {
    setPreferredYouSeat(id)
  }

  function applyYourSide(choice: S | 'random') {
    const next = applySidePreset(seatIds, choice)
    setSeats(next.seats)
    setPreferredYouSeat(next.youSeat)
  }

  return { seats, youSeat, setSeatType, setYouSeat, applyYourSide }
}