import { useMemo, type ReactNode } from 'react'
import type { MatchSeatEntry } from '@/components/game/MatchSeatSetup/MatchSeatSetup'
import { TwoSeatMatchConfigView } from '@/components/game/TwoSeatMatchConfig/TwoSeatMatchConfig'
import {
  createAiTestPosition,
  type AiGameTestContext,
} from '@/presentation/match-setup/ai-test-context'
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
  const testContext = useMemo<AiGameTestContext>(() => {
    const game = new XiangqiGame()
    const initial = game.createInitialState()
    return {
      gameId: 'xiangqi',
      gameName: '中国象棋',
      rulesSummary: XIANGQI_RULES_SUMMARY,
      parseAction: (raw) => game.parseAction(raw),
      createPosition: (playerId) => createAiTestPosition(game, initial, playerId),
    }
  }, [])

  return (
    <TwoSeatMatchConfigView<XiangqiSide>
      header={header}
      seats={SEATS}
      rulesSummary={XIANGQI_RULES_SUMMARY}
      testContext={testContext}
      onStart={(config) => {
        const game = new XiangqiGame()
        onStart({ config, save: game.serialize(game.createInitialState()) })
      }}
    />
  )
}