import { GameModel } from '@/games/GameModel'

export { GomokuGame } from './domain/GomokuGame'
export * from './domain/types'
export {
  selectResult,
  selectEndReason,
  selectWinningLine,
  selectGomokuBoardViewModel,
  type GomokuBoardViewModel,
} from './domain/selectors'

export const gomokuGameModel = new GameModel({
  id: 'gomoku',
  name: '五子棋',
  description: '落子成五，先连成一线者胜。',
  path: '/config/gomoku',
})