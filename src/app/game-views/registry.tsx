import { GomokuConfigView } from '@/games/gomoku/config/GomokuConfigView'
import type { GameId } from '@/games/registry'
import { GomokuMatch } from './gomoku/GomokuMatch'
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
}