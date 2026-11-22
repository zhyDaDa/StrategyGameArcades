import { GameModel } from '@/games/GameModel'

export { GoGame } from './domain/GoGame'
export * from './domain/types'
export {
  selectResult,
  selectEndReason,
  selectScore,
  selectCaptures,
  selectGoBoardViewModel,
  type GoBoardViewModel,
} from './domain/selectors'

export const goGameModel = new GameModel({
  id: 'go',
  name: '围棋',
  description: '围地提子，数子定胜负。',
  path: '/config/go',
})