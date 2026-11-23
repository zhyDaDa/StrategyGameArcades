import type { ReactNode } from 'react'
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
  readonly header: ReactNode
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

export function NestedTicTacToeConfigView({
  header,
  onStart,
}: NestedTicTacToeConfigViewProps) {
  return (
    <TwoSeatMatchConfigView<NestedTicTacToeSide>
      header={header}
      seats={SEATS}
      rulesSummary={NESTED_TIC_TAC_TOE_RULES_SUMMARY}
      onStart={(config) => {
        const game = createNestedTicTacToeGame()
        onStart({ config, save: game.serialize(game.createInitialState()) })
      }}
    />
  )
}