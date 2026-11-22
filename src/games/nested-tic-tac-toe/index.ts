import { GameModel } from '@/games/GameModel'

export { NestedTicTacToeGame } from './domain/NestedTicTacToeGame'
export * from './domain/types'
export {
  selectResult,
  selectEndReason,
  selectMicroBoardResults,
  selectCapturedCounts,
  selectMacroOutcome,
  selectForcedBoard,
  selectFreshPlacedCell,
  selectFreshMicroBoards,
  selectNestedTicTacToeBoardViewModel,
  type NestedTicTacToeEndReason,
  type NestedTicTacToeBoardViewModel,
} from './domain/selectors'

export const nestedTicTacToeGameModel = new GameModel({
  id: 'nested-tic-tac-toe',
  name: '九宫井字棋',
  description: '小棋盘三连夺格，大棋盘三连取胜。',
  path: '/config/nested-tic-tac-toe',
})