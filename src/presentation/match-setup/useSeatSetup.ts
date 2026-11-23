import { useMemo, useState } from 'react'
import { DEFAULT_AI_CONFIG_BY_TYPE, type AiSeatConfig } from './ai-config'
import { resolveYouSeat } from './seats'
import type { SeatAssignment, SeatType } from './types'

export interface UseSeatSetupParams<S extends string> {
  /** 本局全部席位；多席位游戏可以一次管理所有颜色。 */
  readonly seatIds: readonly S[]
  /** 默认的房主席位；未配置的席位一律默认交给人类。 */
  readonly defaultYouSeat: S
  /** 当前启用的席位；人数变化时用它校正「你的席位」。 */
  readonly activeSeatIds?: readonly S[]
}

export interface UseSeatSetupResult<S extends string> {
  readonly seats: readonly SeatAssignment<S>[]
  readonly youSeat: S | null
  /** 只改单个席位的接入方式；允许全部不是人类。 */
  readonly setSeatType: (id: S, type: SeatType) => void
  /** 设置真人席位的显示名称；留空即清除。 */
  readonly setSeatName: (id: S, name: string) => void
  /** 更新该席位的 AI 配置；不包含任何密钥。 */
  readonly setSeatAi: (id: S, ai: AiSeatConfig | undefined) => void
  /** 在现有真人席位中选择本机操作者（房主）。 */
  readonly setYouSeat: (id: S) => void
}

/**
 * 配置页的席位状态。接入方式与「房主」分离：
 * 前者决定谁在决策，后者只标记本机操作者，因此全自动对弈时 `youSeat` 为 null。
 */
export function useSeatSetup<S extends string>({
  seatIds,
  defaultYouSeat,
  activeSeatIds = seatIds,
}: UseSeatSetupParams<S>): UseSeatSetupResult<S> {
  const [seats, setSeats] = useState<readonly SeatAssignment<S>[]>(() =>
    seatIds.map((id): SeatAssignment<S> => ({ id, type: 'human' })),
  )
  const [preferredYouSeat, setPreferredYouSeat] = useState<S | null>(defaultYouSeat)

  const activeSet = useMemo(() => new Set(activeSeatIds), [activeSeatIds])
  const youSeat = resolveYouSeat(seats, preferredYouSeat, activeSet)

  function setSeatType(id: S, type: SeatType) {
    setSeats((current) =>
      current.map((seat) =>
        seat.id === id
          ? { ...seat, type, ai: DEFAULT_AI_CONFIG_BY_TYPE[type] }
          : seat,
      ),
    )
    // 从「全自动」恢复出第一位真人时，直接把它作为本机操作者，避免沿用旧席位。
    if (type === 'human' && youSeat === null) {
      setPreferredYouSeat(id)
    }
  }

  function setSeatAi(id: S, ai: AiSeatConfig | undefined) {
    setSeats((current) =>
      current.map((seat) => (seat.id === id ? { ...seat, ai } : seat)),
    )
  }

  function setSeatName(id: S, name: string) {
    const trimmed = name.trim()
    setSeats((current) =>
      current.map((seat) =>
        seat.id === id
          ? { ...seat, name: trimmed === '' ? undefined : trimmed }
          : seat,
      ),
    )
  }

  function setYouSeat(id: S) {
    setPreferredYouSeat(id)
  }

  return { seats, youSeat, setSeatType, setSeatName, setSeatAi, setYouSeat }
}