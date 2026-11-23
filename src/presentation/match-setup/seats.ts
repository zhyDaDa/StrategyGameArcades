import type { SeatAssignment } from './types'

/** 当前启用席位中的真人席位；没有真人时返回空数组。 */
export function humanSeatIds<S extends string>(
  seats: readonly SeatAssignment<S>[],
  activeIds?: ReadonlySet<S>,
): S[] {
  return seats
    .filter((seat) => seat.type === 'human' && (activeIds === undefined || activeIds.has(seat.id)))
    .map((seat) => seat.id)
}

/** 校正「你的席位」：优先保留当前选择，否则落到第一位真人。 */
export function resolveYouSeat<S extends string>(
  seats: readonly SeatAssignment<S>[],
  preferred: S | null,
  activeIds?: ReadonlySet<S>,
): S | null {
  const humans = humanSeatIds(seats, activeIds)
  if (preferred !== null && humans.includes(preferred)) {
    return preferred
  }
  return humans[0] ?? null
}

/** 配置页使用；规则层不得依赖无种子随机。 */
export function pickRandomSeat<S extends string>(ids: readonly S[]): S {
  if (ids.length === 0) {
    throw new Error('至少需要一个席位')
  }
  return ids[Math.floor(Math.random() * ids.length)]
}