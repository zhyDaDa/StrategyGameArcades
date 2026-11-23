import { Button } from '@/components/ui/button'
import {
  SEAT_ACCENT_CLASS,
  SEAT_KIND_META,
} from '@/presentation/match-setup/seat-kinds'
import type { AiGameTestContext } from '@/presentation/match-setup/ai-test-context'
import type { AiSeatConfig } from '@/presentation/match-setup/ai-config'
import type { SeatAssignment, SeatType } from '@/presentation/match-setup/types'
import type { SeatVerification } from '@/presentation/ai/seat-verification'
import type { MatchSeatEntry } from '../MatchSeatSetup/MatchSeatSetup'
import { SeatKindIcon } from '../SeatKindIcon/SeatKindIcon'
import { AlgorithmSeatForm } from './AlgorithmSeatForm'
import { HumanSeatForm } from './HumanSeatForm'
import { LlmSeatForm } from './LlmSeatForm'
import { LocalSeatForm } from './LocalSeatForm'
import { SeatConfigTabs } from './SeatConfigTabs'

export interface SeatConfigPanelProps<S extends string> {
  readonly seat: MatchSeatEntry<S>
  readonly assignment: SeatAssignment<S>
  readonly isHost: boolean
  readonly testContext: AiGameTestContext
  readonly verification: SeatVerification | undefined
  readonly onTypeChange: (type: SeatType) => void
  readonly onNameChange: (name: string) => void
  readonly onAiChange: (ai: AiSeatConfig | undefined) => void
  readonly onVerified: (verification: SeatVerification) => void
  readonly onMakeHost: () => void
  readonly onClose: () => void
}

/**
 * 单个席位的玩家配置页：左侧选择接入方式，右侧编辑该方式的配置。
 * 整页固定为可用高度，左侧竖线不随右侧内容长短伸缩；
 * 只有底部的「保存配置」会返回主配置页，避免未确认就离开。
 */
export function SeatConfigPanel<S extends string>({
  seat,
  assignment,
  isHost,
  testContext,
  verification,
  onTypeChange,
  onNameChange,
  onAiChange,
  onVerified,
  onMakeHost,
  onClose,
}: SeatConfigPanelProps<S>) {
  const activeType = assignment.type
  const meta = SEAT_KIND_META[activeType]
  const currentMeta = SEAT_KIND_META[assignment.type]
  const currentAccent = SEAT_ACCENT_CLASS[currentMeta.accent]

  function changeType(next: SeatType) {
    onTypeChange(next)
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-4 border-b pb-6">
        <div className="shrink-0">{seat.badge}</div>
        <div className="flex min-w-0 flex-col">
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">
            PLAYER / 玩家配置
          </p>
          <h2 className="truncate text-2xl font-semibold tracking-tight">
            {seat.label}
            {assignment.name !== undefined ? ` · ${assignment.name}` : ''}
          </h2>
        </div>
        <span
          className={[
            'ml-auto flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs',
            currentAccent.text,
          ].join(' ')}
        >
          <SeatKindIcon type={assignment.type} className="size-3.5" />
          {currentMeta.label}
          {isHost ? ' · 房主' : ''}
        </span>
      </header>

      <div className="grid min-h-0 flex-1 gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <SeatConfigTabs activeType={activeType} onChange={changeType} />

        <div className="scroll-area min-h-0 min-w-0 overflow-y-auto py-6">
          <h3 className="mb-4 text-base font-semibold tracking-tight">
            {meta.label}
            <span className="ml-2 font-normal text-muted-foreground">{meta.description}</span>
          </h3>

          {activeType === 'human' ? (
            <HumanSeatForm
              name={assignment.name ?? ''}
              isHost={isHost}
              onNameChange={onNameChange}
              onMakeHost={onMakeHost}
            />
          ) : null}
          {activeType === 'algorithm' ? (
            <AlgorithmSeatForm
              seatId={assignment.id}
              config={assignment.ai}
              onChange={onAiChange}
              context={testContext}
              verification={verification}
              onVerified={onVerified}
            />
          ) : null}
          {activeType === 'llm' ? (
            <LlmSeatForm
              seatId={assignment.id}
              config={assignment.ai}
              onChange={onAiChange}
              context={testContext}
              verification={verification}
              onVerified={onVerified}
            />
          ) : null}
          {activeType === 'local' ? (
            <LocalSeatForm
              seatId={assignment.id}
              config={assignment.ai}
              onChange={onAiChange}
              context={testContext}
              verification={verification}
              onVerified={onVerified}
            />
          ) : null}
        </div>
      </div>

      <footer className="flex shrink-0 justify-end border-t pt-4">
        <Button onClick={onClose}>保存配置</Button>
      </footer>
    </section>
  )
}