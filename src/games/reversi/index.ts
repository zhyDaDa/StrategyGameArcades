import { GameModel } from '@/games/GameModel'

export { ReversiGame } from './domain/ReversiGame'
export * from './domain/types'
export {
  selectResult,
  selectDiscCounts,
  selectReversiBoardViewModel,
  type ReversiBoardViewModel,
} from './domain/selectors'

export const reversiGameModel = new GameModel({
  id: 'reversi',
  name: '黑白棋',
  description: '夹住即翻，终局棋子多者胜。',
  path: '/config/reversi',
  cover: null,
})