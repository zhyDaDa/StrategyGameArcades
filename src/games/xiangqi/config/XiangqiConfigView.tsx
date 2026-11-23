import type { ReactNode } from 'react'
import type { MatchSeatEntry } from '@/components/game/MatchSeatSetup/MatchSeatSetup'
import { TwoSeatMatchConfigView } from '@/components/game/TwoSeatMatchConfig/TwoSeatMatchConfig'
import { XiangqiGame } from '../domain/XiangqiGame'
import type { XiangqiSide } from '../domain/types'
import { XiangqiSideBadge } from '../ui/XiangqiSideBadge'
import { XIANGQI_RULES_SUMMARY, type XiangqiMatchConfig } from './match-config'

export interface XiangqiConfigViewProps {
  readonly header: ReactNode
  readonly onStart: (payload: {
    readonly config: XiangqiMatchConfig
    readonly save: string
  }) => void
}

const SEATS: readonly [MatchSeatEntry<XiangqiSide>, MatchSeatEntry<XiangqiSide>] = [
  {
    id: 'red',
    label: '红方',
    hint: '先行 · 执红',
    badge: <XiangqiSideBadge side="red" />,
  },
  {
    id: 'black',
    label: '黑方',
    hint: '后行 · 执黑',
    badge: <XiangqiSideBadge side="black" />,
  },
]

export function XiangqiConfigView({ header, onStart }: XiangqiConfigViewProps) {
  return (
    <TwoSeatMatchConfigView<XiangqiSide>
      header={header}
      seats={SEATS}
      rulesSummary={XIANGQI_RULES_SUMMARY}
      onStart={(config) => {
        const game = new XiangqiGame()
        onStart({ config, save: game.serialize(game.createInitialState()) })
      }}
    />
  )
}