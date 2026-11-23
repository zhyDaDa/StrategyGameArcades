import { useState, type ReactNode } from 'react'
import { ConfigDeck } from '@/components/game/ConfigDeck/ConfigDeck'
import { MatchConfigLayout } from '@/components/game/MatchConfigLayout/MatchConfigLayout'
import {
  MatchSeatSetup,
  type MatchSeatEntry,
} from '@/components/game/MatchSeatSetup/MatchSeatSetup'
import { SeatConfigPanel } from '@/components/game/SeatConfigPanel/SeatConfigPanel'
import {
  EMPTY_SEAT_DRAFT,
  type SeatDraft,
} from '@/components/game/SeatConfigPanel/seat-draft'
import { SEAT_ACCENT_CLASS, SEAT_KIND_META } from '@/presentation/match-setup/seat-kinds'
import { useSeatSetup } from '@/presentation/match-setup/useSeatSetup'
import type { SeatMatchConfig, SeatType } from '@/presentation/match-setup/types'

export interface TwoSeatMatchConfigViewProps<S extends string> {
  /** 页面标题区；由配置路由传入，随整页一起翻走。 */
  readonly header: ReactNode
  readonly seats: readonly [MatchSeatEntry<S>, MatchSeatEntry<S>]
  readonly rulesSummary: string
  readonly onStart: (config: SeatMatchConfig<S>) => void
}

/**
 * 双席位对局配置：主页只展示席位概览与开局入口，
 * 具体席位设置通过整页翻页进入独立的玩家配置页。
 */
export function TwoSeatMatchConfigView<S extends string>({
  header,
  seats,
  rulesSummary,
  onStart,
}: TwoSeatMatchConfigViewProps<S>) {
  const setup = useSeatSetup({
    seatIds: seats.map((seat) => seat.id),
    defaultYouSeat: seats[0].id,
  })
  const [activeSeatId, setActiveSeatId] = useState<S | null>(null)
  const [lastSeatId, setLastSeatId] = useState<S | null>(null)
  const [drafts, setDrafts] = useState<Record<string, SeatDraft>>({})

  const byId = new Map(setup.seats.map((seat) => [seat.id, seat]))
  const humanCount = setup.seats.filter((seat) => seat.type === 'human').length
  const unplayable = setup.seats.filter((seat) => !SEAT_KIND_META[seat.type].playable)
  const lastSeat = seats.find((seat) => seat.id === lastSeatId)
  const lastAssignment = lastSeatId === null ? undefined : byId.get(lastSeatId)
  const draft = lastSeatId === null ? EMPTY_SEAT_DRAFT : drafts[lastSeatId] ?? EMPTY_SEAT_DRAFT

  function openSeat(id: S) {
    setLastSeatId(id)
    setActiveSeatId(id)
  }

  function closeSeat() {
    setActiveSeatId(null)
  }

  function updateDraft(id: S, patch: Partial<SeatDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] ?? EMPTY_SEAT_DRAFT), ...patch },
    }))
  }

  const summary = (
    <div className="flex flex-col gap-1">
      <p className="text-sm">
        {humanCount === 0
          ? '全自动对弈'
          : `${humanCount} 位真人 · ${seats.length - humanCount} 个非人类席位`}
      </p>
      <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
        {seats.map((seat) => {
          const assignment = byId.get(seat.id)
          if (assignment === undefined) {
            return null
          }
          const meta = SEAT_KIND_META[assignment.type]
          const accent = SEAT_ACCENT_CLASS[meta.accent]
          return (
            <li key={seat.id} className="flex items-center gap-1.5">
              <span>{seat.label}</span>
              <span>·</span>
              <span className={accent.text}>{assignment.name ?? meta.label}</span>
              {setup.youSeat === seat.id ? <span>（房主）</span> : null}
            </li>
          )
        })}
      </ul>
    </div>
  )

  const main = (
    <div className="flex flex-col gap-10">
      {header}
      <MatchConfigLayout
        onStart={() => onStart({ seats: setup.seats, youSeat: setup.youSeat })}
        startLabel={humanCount === 0 ? '观看对局' : '开始对局'}
        startDisabled={unplayable.length > 0}
        summary={summary}
        footer={
          unplayable.length > 0 ? (
            <p className="text-xs text-destructive">
              {unplayable.map((seat) => SEAT_KIND_META[seat.type].label).join(' / ')}
              接入尚未接通；先把这些席位换成人类或算法再开局。
            </p>
          ) : undefined
        }
      >
        <MatchSeatSetup
          seats={seats}
          assignments={setup.seats}
          youSeat={setup.youSeat}
          onConfigure={openSeat}
        />

        <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          {rulesSummary}
        </div>
      </MatchConfigLayout>
    </div>
  )

  const panel =
    lastSeat !== undefined && lastAssignment !== undefined ? (
      <SeatConfigPanel<S>
        key={lastSeat.id}
        seat={lastSeat}
        assignment={lastAssignment}
        isHost={setup.youSeat === lastSeat.id}
        draft={draft}
        onTypeChange={(type: SeatType) => setup.setSeatType(lastSeat.id, type)}
        onNameChange={(name) => setup.setSeatName(lastSeat.id, name)}
        onMakeHost={() => {
          setup.setSeatType(lastSeat.id, 'human')
          setup.setYouSeat(lastSeat.id)
        }}
        onDraftChange={(patch) => updateDraft(lastSeat.id, patch)}
        onClose={closeSeat}
      />
    ) : null

  return <ConfigDeck open={activeSeatId !== null} main={main} panel={panel} />
}