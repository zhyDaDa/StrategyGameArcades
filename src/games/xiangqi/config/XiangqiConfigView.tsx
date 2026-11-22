import type { MatchSeatEntry } from '@/components/game/MatchSeatSetup/MatchSeatSetup'
import { TwoSeatMatchConfigView } from '@/components/game/TwoSeatMatchConfig/TwoSeatMatchConfig'
import { XiangqiGame } from '../domain/XiangqiGame'
import type { XiangqiSide } from '../domain/types'
import { XiangqiSideBadge } from '../ui/XiangqiSideBadge'
import { XIANGQI_RULES_SUMMARY, type XiangqiMatchConfig } from './match-config'

export interface XiangqiConfigViewProps {
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

const SIDE_OPTIONS: readonly { readonly id: XiangqiSide; readonly label: string }[] = [
  { id: 'red', label: '执红' },
  { id: 'black', label: '执黑' },
]

export function XiangqiConfigView({ onStart }: XiangqiConfigViewProps) {
  return (
    <TwoSeatMatchConfigView<XiangqiSide>
      seats={SEATS}
      sideOptions={SIDE_OPTIONS}
      sideLabel="你的执子"
      sideHint="选择后该方为真人、另一方为 AI；也可以在上方席位自由调整，包括 AI 对 AI。"
      randomSideLabel="随机执子"
      rulesSummary={XIANGQI_RULES_SUMMARY}
      onStart={(config) => {
        const game = new XiangqiGame()
        onStart({ config, save: game.serialize(game.createInitialState()) })
      }}
    />
  )
}