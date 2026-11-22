import type { MatchSeatEntry } from '@/components/game/MatchSeatSetup/MatchSeatSetup'
import { PlayerBadge } from '@/components/game/PlayerBadge/PlayerBadge'
import { TwoSeatMatchConfigView } from '@/components/game/TwoSeatMatchConfig/TwoSeatMatchConfig'
import {
  PLAYER_SEAT_META,
  type PlayerSeatMeta,
} from '@/presentation/player-seats/player-seats'
import type { NestedTicTacToeSide } from '../domain/types'
import {
  NESTED_TIC_TAC_TOE_RULES_SUMMARY,
  createNestedTicTacToeGame,
  type NestedTicTacToeMatchConfig,
} from './match-config'

export interface NestedTicTacToeConfigViewProps {
  readonly onStart: (payload: {
    readonly config: NestedTicTacToeMatchConfig
    readonly save: string
  }) => void
}

const RED: PlayerSeatMeta = PLAYER_SEAT_META.red
const BLUE: PlayerSeatMeta = PLAYER_SEAT_META.blue

const SEATS: readonly [
  MatchSeatEntry<NestedTicTacToeSide>,
  MatchSeatEntry<NestedTicTacToeSide>,
] = [
  {
    id: 'red',
    label: RED.label,
    hint: '先手 · 圆',
    badge: <PlayerBadge symbol={RED.symbol} color={RED.color} className="size-10" />,
  },
  {
    id: 'blue',
    label: BLUE.label,
    hint: '后手 · 叉',
    badge: <PlayerBadge symbol={BLUE.symbol} color={BLUE.color} className="size-10" />,
  },
]

const SIDE_OPTIONS: readonly { readonly id: NestedTicTacToeSide; readonly label: string }[] = [
  { id: 'red', label: '执红' },
  { id: 'blue', label: '执蓝' },
]

export function NestedTicTacToeConfigView({ onStart }: NestedTicTacToeConfigViewProps) {
  return (
    <TwoSeatMatchConfigView<NestedTicTacToeSide>
      seats={SEATS}
      sideOptions={SIDE_OPTIONS}
      sideLabel="你的执子"
      sideHint="红方固定先手；选择后该方为真人、另一方为 AI，也可以在上方席位自由调整。"
      randomSideLabel="随机执子"
      rulesSummary={NESTED_TIC_TAC_TOE_RULES_SUMMARY}
      onStart={(config) => {
        const game = createNestedTicTacToeGame()
        onStart({ config, save: game.serialize(game.createInitialState()) })
      }}
    />
  )
}