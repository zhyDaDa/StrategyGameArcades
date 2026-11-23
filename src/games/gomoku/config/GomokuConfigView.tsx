import type { ReactNode } from 'react'
import { StoneBadge } from '@/components/game/StoneBadge/StoneBadge'
import type { MatchSeatEntry } from '@/components/game/MatchSeatSetup/MatchSeatSetup'
import { TwoSeatMatchConfigView } from '@/components/game/TwoSeatMatchConfig/TwoSeatMatchConfig'
import { GomokuGame } from '../domain/GomokuGame'
import type { GomokuSide } from '../domain/types'
import { GOMOKU_RULES_SUMMARY, type GomokuMatchConfig } from './match-config'

export interface GomokuConfigViewProps {
  readonly header: ReactNode
  readonly onStart: (payload: { readonly config: GomokuMatchConfig; readonly save: string }) => void
}

const SEATS: readonly [MatchSeatEntry<GomokuSide>, MatchSeatEntry<GomokuSide>] = [
  {
    id: 'black',
    label: '黑方',
    hint: '先手 · 执黑',
    badge: <StoneBadge side="black" />,
  },
  {
    id: 'white',
    label: '白方',
    hint: '后手 · 执白',
    badge: <StoneBadge side="white" />,
  },
]

export function GomokuConfigView({ header, onStart }: GomokuConfigViewProps) {
  return (
    <TwoSeatMatchConfigView<GomokuSide>
      header={header}
      seats={SEATS}
      rulesSummary={GOMOKU_RULES_SUMMARY}
      onStart={(config) => {
        const game = new GomokuGame()
        onStart({ config, save: game.serialize(game.createInitialState()) })
      }}
    />
  )
}