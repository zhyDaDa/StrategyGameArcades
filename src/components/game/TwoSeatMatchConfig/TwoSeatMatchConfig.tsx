import { useState, type ReactNode } from 'react'
import { ConfigDeck } from '@/components/game/ConfigDeck/ConfigDeck'
import { MatchConfigLayout } from '@/components/game/MatchConfigLayout/MatchConfigLayout'
import {
  MatchSeatSetup,
  type MatchSeatEntry,
} from '@/components/game/MatchSeatSetup/MatchSeatSetup'
import { SeatConfigPanel } from '@/components/game/SeatConfigPanel/SeatConfigPanel'
import { SEAT_ACCENT_CLASS, SEAT_KIND_META } from '@/presentation/match-setup/seat-kinds'
import type { AiGameTestContext } from '@/presentation/match-setup/ai-test-context'
import type { AiSeatConfig } from '@/presentation/match-setup/ai-config'
import { useSeatSetup } from '@/presentation/match-setup/useSeatSetup'
import type { SeatMatchConfig, SeatType } from '@/presentation/match-setup/types'
import {
  collectSeatIssues,
  type SeatVerificationMap,
} from '@/presentation/ai/seat-verification'

export interface TwoSeatMatchConfigViewProps<S extends string> {
  /** 页面标题区；由配置路由传入，随整页一起翻走。 */
  readonly header: ReactNode
  readonly seats: readonly [MatchSeatEntry<S>, MatchSeatEntry<S>]
  readonly rulesSummary: string
  /** 当前游戏给 AI 配置用的真实样例局面。 */
  readonly testContext: AiGameTestContext
  readonly onStart: (config: SeatMatchConfig<S>) => void
}

/**
 * 双席位对局配置：主页只展示席位概览与开局入口，
 * 具体席位设置通过整页翻页进入独立的玩家配置页。
 *
 * AI 席位必须在本次配置会话里通过真实测试，配置指纹变化后立即失效。
 */
export function TwoSeatMatchConfigView<S extends string>({
  header,
  seats,
  rulesSummary,
  testContext,
  onStart,
}: TwoSeatMatchConfigViewProps<S>) {
  const setup = useSeatSetup({
    seatIds: seats.map((seat) => seat.id),
    defaultYouSeat: seats[0].id,
  })
  const [activeSeatId, setActiveSeatId] = useState<S | null>(null)
  const [lastSeatId, setLastSeatId] = useState<S | null>(null)
  const [verifications, setVerifications] = useState<SeatVerificationMap>({})

  const byId = new Map(setup.seats.map((seat) => [seat.id, seat]))
  const humanCount = setup.seats.filter((seat) => seat.type === 'human').length
  const issues = collectSeatIssues(setup.seats, verifications)
  const lastSeat = seats.find((seat) => seat.id === lastSeatId)
  const lastAssignment = lastSeatId === null ? undefined : byId.get(lastSeatId)
  const verification = lastSeatId === null ? undefined : verifications[lastSeatId]

  function openSeat(id: S) {
    setLastSeatId(id)
    setActiveSeatId(id)
  }

  function closeSeat() {
    setActiveSeatId(null)
  }

  function changeType(id: S, type: SeatType) {
    setup.setSeatType(id, type)
    setVerifications((current) => removeKey(current, id))
  }

  function changeAi(id: S, ai: AiSeatConfig | undefined) {
    setup.setSeatAi(id, ai)
  }

  function recordVerification(id: S, next: NonNullable<typeof verification>) {
    setVerifications((current) => ({ ...current, [id]: next }))
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
        startDisabled={issues.length > 0}
        summary={summary}
        footer={
          issues.length > 0 ? (
            <ul className="flex flex-col gap-1 text-xs text-destructive">
              {issues.slice(0, 3).map((issue) => (
                <li key={issue.seatId}>{issue.message}</li>
              ))}
              {issues.length > 3 ? <li>还有 {issues.length - 3} 个问题需要处理。</li> : null}
            </ul>
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
        testContext={testContext}
        verification={verification}
        onTypeChange={(type: SeatType) => changeType(lastSeat.id, type)}
        onNameChange={(name) => setup.setSeatName(lastSeat.id, name)}
        onAiChange={(ai) => changeAi(lastSeat.id, ai)}
        onVerified={(next) => recordVerification(lastSeat.id, next)}
        onMakeHost={() => {
          setup.setSeatType(lastSeat.id, 'human')
          setVerifications((current) => removeKey(current, lastSeat.id))
          setup.setYouSeat(lastSeat.id)
        }}
        onClose={closeSeat}
      />
    ) : null

  return <ConfigDeck open={activeSeatId !== null} main={main} panel={panel} />
}

function removeKey(
  record: SeatVerificationMap,
  key: string,
): SeatVerificationMap {
  if (!(key in record)) {
    return record
  }
  const next = { ...record }
  delete next[key]
  return next
}