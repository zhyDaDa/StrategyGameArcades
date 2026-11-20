import { GameModel } from '@/games/GameModel'

export { DotsAndBoxesGame, type DotsAndBoxesGameOptions } from './domain/DotsAndBoxesGame'
export * from './domain/types'
export {
  selectResult,
  selectScores,
  selectStandings,
  selectDotsBoardViewModel,
  selectClaimedBoxes,
  claimedBoxIndexes,
  type DotsBoardViewModel,
  type DotsScores,
  type DotsStanding,
} from './domain/selectors'

export const dotsAndBoxesGameModel = new GameModel({
  id: 'dots-and-boxes',
  name: '方格大战',
  description: '连点围格，得分续手，占满棋盘比分数。',
  path: '/config/dots-and-boxes',
  cover: null,
})