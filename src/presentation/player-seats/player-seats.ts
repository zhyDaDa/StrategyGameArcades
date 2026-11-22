/** 四色 + 四符号的统一玩家视觉语言：方格大战、九宫井字棋等游戏共用。 */
export const PLAYER_SEATS = ['red', 'blue', 'green', 'yellow'] as const
export type PlayerSeat = (typeof PLAYER_SEATS)[number]

export const PLAYER_SEAT_SYMBOLS = ['circle', 'cross', 'triangle', 'diamond'] as const
export type PlayerSeatSymbol = (typeof PLAYER_SEAT_SYMBOLS)[number]

export interface PlayerSeatMeta {
  readonly label: string
  readonly color: string
  readonly symbol: PlayerSeatSymbol
}

/** 颜色与符号的唯一来源：红=圆、蓝=叉、绿=三角、黄=菱形。 */
export const PLAYER_SEAT_META: Record<PlayerSeat, PlayerSeatMeta> = {
  red: { label: '红方', color: '#b0453b', symbol: 'circle' },
  blue: { label: '蓝方', color: '#456b87', symbol: 'cross' },
  green: { label: '绿方', color: '#5b7a4c', symbol: 'triangle' },
  yellow: { label: '黄方', color: '#c29a3c', symbol: 'diamond' },
}

/** 铺在玩家色大底上的纸白符号。 */
export const PLAYER_SEAT_ON_COLOR = '#fbf8f1'

export function playerSeatColor(seat: PlayerSeat): string {
  return PLAYER_SEAT_META[seat].color
}