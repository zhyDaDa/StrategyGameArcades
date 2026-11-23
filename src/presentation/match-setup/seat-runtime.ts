import { SEAT_KIND_META } from './seat-kinds'
import type { SeatAssignment } from './types'

/**
 * 配置页只会让可运行的接入方式开局；这里兜住旧存档或外部写入的越界配置，
 * 明确报错而不是悄悄退化成内置算法。
 */
export function assertSeatPlayable(
  seat: Pick<SeatAssignment<string>, 'id' | 'type'>,
): void {
  const meta = SEAT_KIND_META[seat.type]
  if (!meta.playable) {
    throw new Error(
      `席位「${seat.id}」选择了「${meta.label}」，该接入方式尚未接通，无法开局。`,
    )
  }
}