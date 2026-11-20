import { gomokuGameModel } from '@/games/gomoku'
import { reversiGameModel } from '@/games/reversi'

/** 唯一的游戏注册入口：新增游戏时只在这里登记其 GameModel。 */
export const GAMES = [gomokuGameModel, reversiGameModel] as const

export type GameId = (typeof GAMES)[number]['id']