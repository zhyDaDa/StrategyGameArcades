import { chessGameModel } from '@/games/chess'
import { dotsAndBoxesGameModel } from '@/games/dots-and-boxes'
import { goGameModel } from '@/games/go'
import { gomokuGameModel } from '@/games/gomoku'
import { nestedTicTacToeGameModel } from '@/games/nested-tic-tac-toe'
import { reversiGameModel } from '@/games/reversi'
import { xiangqiGameModel } from '@/games/xiangqi'

/** 唯一的游戏注册入口：新增游戏时只在这里登记其 GameModel。 */
export const GAMES = [
  gomokuGameModel,
  goGameModel,
  reversiGameModel,
  xiangqiGameModel,
  chessGameModel,
  dotsAndBoxesGameModel,
  nestedTicTacToeGameModel,
] as const

export type GameId = (typeof GAMES)[number]['id']