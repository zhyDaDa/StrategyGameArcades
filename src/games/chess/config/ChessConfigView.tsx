import type { MatchSeatEntry } from '@/components/game/MatchSeatSetup/MatchSeatSetup'
import { TwoSeatMatchConfigView } from '@/components/game/TwoSeatMatchConfig/TwoSeatMatchConfig'
import { ChessGame } from '../domain/ChessGame'
import type { ChessSide } from '../domain/types'
import { ChessSideBadge } from '../ui/ChessSideBadge'
import { CHESS_RULES_SUMMARY, type ChessMatchConfig } from './match-config'

export interface ChessConfigViewProps {
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

const SIDE_OPTIONS: readonly { readonly id: ChessSide; readonly label: string }[] = [
  { id: 'white', label: '执白' },
  { id: 'black', label: '执黑' },
]

export function ChessConfigView({ onStart }: ChessConfigViewProps) {
  return (
    <TwoSeatMatchConfigView<ChessSide>
      seats={SEATS}
      sideOptions={SIDE_OPTIONS}
      sideLabel="你的执子"
      sideHint="选择后该方为真人、另一方为 AI；也可以在上方席位自由调整，包括 AI 对 AI。"
      randomSideLabel="随机执子"
      rulesSummary={CHESS_RULES_SUMMARY}
      onStart={(config) => {
        const game = new ChessGame()
        onStart({ config, save: game.serialize(game.createInitialState()) })
      }}
    />
  )
}