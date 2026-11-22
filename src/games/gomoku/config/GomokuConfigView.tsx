import { StoneBadge } from '@/components/game/StoneBadge/StoneBadge'
import type { MatchSeatEntry } from '@/components/game/MatchSeatSetup/MatchSeatSetup'
import { TwoSeatMatchConfigView } from '@/components/game/TwoSeatMatchConfig/TwoSeatMatchConfig'
import { GomokuGame } from '../domain/GomokuGame'
import type { GomokuSide } from '../domain/types'
import { GOMOKU_RULES_SUMMARY, type GomokuMatchConfig } from './match-config'

export interface GomokuConfigViewProps {
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

const SIDE_OPTIONS: readonly { readonly id: GomokuSide; readonly label: string }[] = [
  { id: 'black', label: '执黑' },
  { id: 'white', label: '执白' },
]

export function GomokuConfigView({ onStart }: GomokuConfigViewProps) {
  return (
    <TwoSeatMatchConfigView<GomokuSide>
      seats={SEATS}
      sideOptions={SIDE_OPTIONS}
      sideLabel="你的执子"
      sideHint="选择后该方为真人、另一方为 AI；也可以在上方席位自由调整，包括 AI 对 AI。"
      randomSideLabel="随机执子"
      rulesSummary={GOMOKU_RULES_SUMMARY}
      onStart={(config) => {
        const game = new GomokuGame()
        onStart({ config, save: game.serialize(game.createInitialState()) })
      }}
    />
  )
}