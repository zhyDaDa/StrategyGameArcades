import type { ReactNode } from 'react'
import { StoneBadge } from '@/components/game/StoneBadge/StoneBadge'
import type { MatchSeatEntry } from '@/components/game/MatchSeatSetup/MatchSeatSetup'
import { TwoSeatMatchConfigView } from '@/components/game/TwoSeatMatchConfig/TwoSeatMatchConfig'
import { GoGame } from '../domain/GoGame'
import type { GoSide } from '../domain/types'
import { GO_RULES_SUMMARY, type GoMatchConfig } from './match-config'

export interface GoConfigViewProps {
  readonly header: ReactNode
  readonly onStart: (payload: { readonly config: GoMatchConfig; readonly save: string }) => void
}

const SEATS: readonly [MatchSeatEntry<GoSide>, MatchSeatEntry<GoSide>] = [
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

export function GoConfigView({ header, onStart }: GoConfigViewProps) {
  return (
    <TwoSeatMatchConfigView<GoSide>
      header={header}
      seats={SEATS}
      rulesSummary={GO_RULES_SUMMARY}
      onStart={(config) => {
        const game = new GoGame()
        onStart({ config, save: game.serialize(game.createInitialState()) })
      }}
    />
  )
}