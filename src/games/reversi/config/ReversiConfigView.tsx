import type { ReactNode } from 'react'
import { StoneBadge } from '@/components/game/StoneBadge/StoneBadge'
import type { MatchSeatEntry } from '@/components/game/MatchSeatSetup/MatchSeatSetup'
import { TwoSeatMatchConfigView } from '@/components/game/TwoSeatMatchConfig/TwoSeatMatchConfig'
import { ReversiGame } from '../domain/ReversiGame'
import type { ReversiSide } from '../domain/types'
import { REVERSI_RULES_SUMMARY, type ReversiMatchConfig } from './match-config'

export interface ReversiConfigViewProps {
  readonly header: ReactNode
  readonly onStart: (payload: { readonly config: ReversiMatchConfig; readonly save: string }) => void
}

const SEATS: readonly [MatchSeatEntry<ReversiSide>, MatchSeatEntry<ReversiSide>] = [
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

export function ReversiConfigView({ header, onStart }: ReversiConfigViewProps) {
  return (
    <TwoSeatMatchConfigView<ReversiSide>
      header={header}
      seats={SEATS}
      rulesSummary={REVERSI_RULES_SUMMARY}
      onStart={(config) => {
        const game = new ReversiGame()
        onStart({ config, save: game.serialize(game.createInitialState()) })
      }}
    />
  )
}