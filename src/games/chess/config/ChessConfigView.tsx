import { useMemo, type ReactNode } from 'react'
import type { MatchSeatEntry } from '@/components/game/MatchSeatSetup/MatchSeatSetup'
import { TwoSeatMatchConfigView } from '@/components/game/TwoSeatMatchConfig/TwoSeatMatchConfig'
import {
  createAiTestPosition,
  type AiGameTestContext,
} from '@/presentation/match-setup/ai-test-context'
import { ChessGame } from '../domain/ChessGame'
import type { ChessSide } from '../domain/types'
import { ChessSideBadge } from '../ui/ChessSideBadge'
import { CHESS_RULES_SUMMARY, type ChessMatchConfig } from './match-config'

export interface ChessConfigViewProps {
  readonly header: ReactNode
  readonly onStart: (payload: {
    readonly config: ChessMatchConfig
    readonly save: string
  }) => void
}

const SEATS: readonly [MatchSeatEntry<ChessSide>, MatchSeatEntry<ChessSide>] = [
  {
    id: 'white',
    label: '白方',
    hint: '先行 · 执白',
    badge: <ChessSideBadge side="white" />,
  },
  {
    id: 'black',
    label: '黑方',
    hint: '后行 · 执黑',
    badge: <ChessSideBadge side="black" />,
  },
]

export function ChessConfigView({ header, onStart }: ChessConfigViewProps) {
  const testContext = useMemo<AiGameTestContext>(() => {
    const game = new ChessGame()
    const initial = game.createInitialState()
    return {
      gameId: 'chess',
      gameName: '国际象棋',
      rulesSummary: CHESS_RULES_SUMMARY,
      parseAction: (raw) => game.parseAction(raw),
      createPosition: (playerId) => createAiTestPosition(game, initial, playerId),
    }
  }, [])

  return (
    <TwoSeatMatchConfigView<ChessSide>
      header={header}
      seats={SEATS}
      rulesSummary={CHESS_RULES_SUMMARY}
      testContext={testContext}
      onStart={(config) => {
        const game = new ChessGame()
        onStart({ config, save: game.serialize(game.createInitialState()) })
      }}
    />
  )
}