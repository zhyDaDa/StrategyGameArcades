import { GameModel } from '@/games/GameModel'

export { ChessGame } from './domain/ChessGame'
export * from './domain/types'
export {
  selectResult,
  selectChessBoardViewModel,
  type ChessBoardViewModel,
} from './domain/selectors'

export const chessGameModel = new GameModel({
  id: 'chess',
  name: '国际象棋',
  description: '白先黑后，王车易位与升变俱全，将死即胜。',
  path: '/config/chess',
})