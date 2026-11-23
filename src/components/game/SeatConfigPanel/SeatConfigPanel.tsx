import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  SEAT_ACCENT_CLASS,
  SEAT_KIND_META,
} from '@/presentation/match-setup/seat-kinds'
import type { SeatAssignment, SeatType } from '@/presentation/match-setup/types'
import type { MatchSeatEntry } from '../MatchSeatSetup/MatchSeatSetup'
import { SeatKindIcon } from '../SeatKindIcon/SeatKindIcon'
import { AlgorithmSeatForm } from './AlgorithmSeatForm'
import { HumanSeatForm } from './HumanSeatForm'
import { LlmSeatForm } from './LlmSeatForm'
import { LocalSeatForm } from './LocalSeatForm'
import { SeatConfigTabs } from './SeatConfigTabs'
import type { SeatDraft } from './seat-draft'

export interface SeatConfigPanelProps<S extends string> {
  readonly seat: MatchSeatEntry<S>
  readonly assignment: SeatAssignment<S>
  readonly isHost: boolean
  readonly draft: SeatDraft
  readonly onTypeChange: (type: SeatType) => void
  readonly onNameChange: (name: string) => void
  readonly onMakeHost: () => void
  readonly onDraftChange: (patch: Partial<SeatDraft>) => void
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
  draft,
  onTypeChange,
  onNameChange,
  onMakeHost,
  onDraftChange,
  onClose,
}: SeatConfigPanelProps<S>) {
  const [activeType, setActiveType] = useState<SeatType>(assignment.type)
  const meta = SEAT_KIND_META[activeType]
  const currentMeta = SEAT_KIND_META[assignment.type]
  const currentAccent = SEAT_ACCENT_CLASS[currentMeta.accent]

  function changeType(next: SeatType) {
    setActiveType(next)
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
          {activeType === 'algorithm' ? <AlgorithmSeatForm /> : null}
          {activeType === 'llm' ? (
            <LlmSeatForm draft={draft} onDraftChange={onDraftChange} />
          ) : null}
          {activeType === 'local' ? (
            <LocalSeatForm draft={draft} onDraftChange={onDraftChange} />
          ) : null}
        </div>
      </div>

      <footer className="flex shrink-0 justify-end border-t pt-4">
        <Button onClick={onClose}>保存配置</Button>
      </footer>
    </section>
  )
}