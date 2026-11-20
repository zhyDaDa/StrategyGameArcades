import type { DotsAndBoxesSeat } from '../domain/types'

export const DotsSeatSymbol = ['circle', 'cross', 'triangle', 'diamond'] as const
export type DotsSeatSymbol = (typeof DotsSeatSymbol)[number]

export interface DotsSeatMeta {
  readonly label: string
  readonly color: string
  readonly symbol: DotsSeatSymbol
}

/** 颜色与符号的唯一来源：蓝=叉、红=圆、绿=三角、黄=菱形。 */
export const DOTS_SEAT_META: Record<DotsAndBoxesSeat, DotsSeatMeta> = {
  red: { label: '红方', color: '#b0453b', symbol: 'circle' },
  blue: { label: '蓝方', color: '#456b87', symbol: 'cross' },
  green: { label: '绿方', color: '#5b7a4c', symbol: 'triangle' },
  yellow: { label: '黄方', color: '#c29a3c', symbol: 'diamond' },
}

export function seatColor(seat: DotsAndBoxesSeat): string {
  return DOTS_SEAT_META[seat].color
}