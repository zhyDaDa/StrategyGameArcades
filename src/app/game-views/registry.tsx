import { DotsAndBoxesConfigView } from '@/games/dots-and-boxes/config/DotsAndBoxesConfigView'
import { GomokuConfigView } from '@/games/gomoku/config/GomokuConfigView'
import { NestedTicTacToeConfigView } from '@/games/nested-tic-tac-toe/config/NestedTicTacToeConfigView'
import { ReversiConfigView } from '@/games/reversi/config/ReversiConfigView'
import type { GameId } from '@/games/registry'
import { DotsAndBoxesMatch } from './dots-and-boxes/DotsAndBoxesMatch'
import { GomokuMatch } from './gomoku/GomokuMatch'
import { NestedTicTacToeMatch } from './nested-tic-tac-toe/NestedTicTacToeMatch'
import { ReversiMatch } from './reversi/ReversiMatch'
import type { GameViewEntry } from './types'

/**
 * app 组合根的游戏视图表：游戏专属配置页与对局页在这里装配。
 * 没有登记的游戏保持占位，不影响注册表里的元数据。
 */
export const GAME_VIEWS: Partial<Record<GameId, GameViewEntry>> = {
  gomoku: {
    Config: ({ onStart }) => (
      <GomokuConfigView onStart={(payload) => onStart(payload)} />
    ),
    Match: GomokuMatch,
  },
  reversi: {
    Config: ({ onStart }) => (
      <ReversiConfigView onStart={(payload) => onStart(payload)} />
    ),
    Match: ReversiMatch,
  },
  'dots-and-boxes': {
    Config: ({ onStart }) => (
      <DotsAndBoxesConfigView onStart={(payload) => onStart(payload)} />
    ),
    Match: DotsAndBoxesMatch,
  },
  'nested-tic-tac-toe': {
    Config: ({ onStart }) => (
      <NestedTicTacToeConfigView onStart={(payload) => onStart(payload)} />
    ),
    Match: NestedTicTacToeMatch,
  },
}