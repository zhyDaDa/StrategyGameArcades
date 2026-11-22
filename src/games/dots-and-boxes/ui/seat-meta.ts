import {
  PLAYER_SEAT_META,
  PLAYER_SEAT_SYMBOLS,
  type PlayerSeatMeta,
  type PlayerSeatSymbol,
} from '@/presentation/player-seats/player-seats'
import type { DotsAndBoxesSeat } from '../domain/types'

export const DotsSeatSymbol = PLAYER_SEAT_SYMBOLS
export type DotsSeatSymbol = PlayerSeatSymbol

export type DotsSeatMeta = PlayerSeatMeta

/** 颜色与符号的唯一来源：蓝=叉、红=圆、绿=三角、黄=菱形。 */
export const DOTS_SEAT_META: Record<DotsAndBoxesSeat, DotsSeatMeta> = PLAYER_SEAT_META

export function seatColor(seat: DotsAndBoxesSeat): string {
  return DOTS_SEAT_META[seat].color
}