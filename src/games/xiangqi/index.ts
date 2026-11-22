import { GameModel } from '@/games/GameModel'

export { XiangqiGame } from './domain/XiangqiGame'
export * from './domain/types'
export {
  selectResult,
  selectXiangqiBoardViewModel,
  type XiangqiBoardViewModel,
} from './domain/selectors'

export const xiangqiGameModel = new GameModel({
  id: 'xiangqi',
  name: '中国象棋',
  description: '红先黑后，车马炮各显其能，将死即胜。',
  path: '/config/xiangqi',
})