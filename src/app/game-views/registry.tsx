import { ChessConfigView } from '@/games/chess/config/ChessConfigView'
import { DotsAndBoxesConfigView } from '@/games/dots-and-boxes/config/DotsAndBoxesConfigView'
import { GoConfigView } from '@/games/go/config/GoConfigView'
import { GomokuConfigView } from '@/games/gomoku/config/GomokuConfigView'
import { NestedTicTacToeConfigView } from '@/games/nested-tic-tac-toe/config/NestedTicTacToeConfigView'
import { ReversiConfigView } from '@/games/reversi/config/ReversiConfigView'
import { XiangqiConfigView } from '@/games/xiangqi/config/XiangqiConfigView'
import type { GameId } from '@/games/registry'
import { ChessMatch } from './chess/ChessMatch'
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
    Config: ({ header, onStart }) => (
      <GomokuConfigView header={header} onStart={(payload) => onStart(payload)} />
    ),
    Match: GomokuMatch,
  },
  go: {
    Config: ({ header, onStart }) => (
      <GoConfigView header={header} onStart={(payload) => onStart(payload)} />
    ),
    Match: GoMatch,
  },
  reversi: {
    Config: ({ header, onStart }) => (
      <ReversiConfigView header={header} onStart={(payload) => onStart(payload)} />
    ),
    Match: ReversiMatch,
  },
  xiangqi: {
    Config: ({ header, onStart }) => (
      <XiangqiConfigView header={header} onStart={(payload) => onStart(payload)} />
    ),
    Match: XiangqiMatch,
  },
  chess: {
    Config: ({ header, onStart }) => (
      <ChessConfigView header={header} onStart={(payload) => onStart(payload)} />
    ),
    Match: ChessMatch,
  },
  'dots-and-boxes': {
    Config: ({ header, onStart }) => (
      <DotsAndBoxesConfigView header={header} onStart={(payload) => onStart(payload)} />
    ),
    Match: DotsAndBoxesMatch,
  },
  'nested-tic-tac-toe': {
    Config: ({ header, onStart }) => (
      <NestedTicTacToeConfigView header={header} onStart={(payload) => onStart(payload)} />
    ),
    Match: NestedTicTacToeMatch,
  },
}