import { DotsAndBoxesConfigView } from '@/games/dots-and-boxes/config/DotsAndBoxesConfigView'
import { GoConfigView } from '@/games/go/config/GoConfigView'
import { GomokuConfigView } from '@/games/gomoku/config/GomokuConfigView'
import { NestedTicTacToeConfigView } from '@/games/nested-tic-tac-toe/config/NestedTicTacToeConfigView'
import { ReversiConfigView } from '@/games/reversi/config/ReversiConfigView'
import { XiangqiConfigView } from '@/games/xiangqi/config/XiangqiConfigView'
import type { GameId } from '@/games/registry'
import { DotsAndBoxesMatch } from './dots-and-boxes/DotsAndBoxesMatch'
import { GoMatch } from './go/GoMatch'
import { GomokuMatch } from './gomoku/GomokuMatch'
import { NestedTicTacToeMatch } from './nested-tic-tac-toe/NestedTicTacToeMatch'
import { ReversiMatch } from './reversi/ReversiMatch'
import { XiangqiMatch } from './xiangqi/XiangqiMatch'
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
  go: {
    Config: ({ onStart }) => (
      <GoConfigView onStart={(payload) => onStart(payload)} />
    ),
    Match: GoMatch,
  },
  reversi: {
    Config: ({ onStart }) => (
      <ReversiConfigView onStart={(payload) => onStart(payload)} />
    ),
    Match: ReversiMatch,
  },
  xiangqi: {
    Config: ({ onStart }) => (
      <XiangqiConfigView onStart={(payload) => onStart(payload)} />
    ),
    Match: XiangqiMatch,
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