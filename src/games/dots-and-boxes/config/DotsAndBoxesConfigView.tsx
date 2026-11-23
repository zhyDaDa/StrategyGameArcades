import { useMemo, useState, type ReactNode } from 'react'
import { ConfigDeck } from '@/components/game/ConfigDeck/ConfigDeck'
import { MatchConfigLayout } from '@/components/game/MatchConfigLayout/MatchConfigLayout'
import {
  MatchSeatSetup,
  type MatchSeatEntry,
} from '@/components/game/MatchSeatSetup/MatchSeatSetup'
import { SeatConfigPanel } from '@/components/game/SeatConfigPanel/SeatConfigPanel'
import { Button } from '@/components/ui/button'
import { SEAT_ACCENT_CLASS, SEAT_KIND_META } from '@/presentation/match-setup/seat-kinds'
import {
  createAiTestPosition,
  type AiGameTestContext,
} from '@/presentation/match-setup/ai-test-context'
import type { AiSeatConfig } from '@/presentation/match-setup/ai-config'
import { pickRandomSeat } from '@/presentation/match-setup/seats'
import { useSeatSetup } from '@/presentation/match-setup/useSeatSetup'
import {
  collectSeatIssues,
  type SeatVerificationMap,
} from '@/presentation/ai/seat-verification'
import {
  DOTS_AND_BOXES_SEATS,
  DOTS_BOARD_SIZES,
  type DotsAndBoxesSeat,
  type DotsBoardSize,
} from '../domain/types'
import { SeatBadge } from '../ui/SeatBadge'
import { DOTS_SEAT_META } from '../ui/seat-meta'
import {
  DOTS_AND_BOXES_RULES_SUMMARY,
  DOTS_MATCH_PLAYER_COUNTS,
  createDotsAndBoxesGame,
  type DotsAndBoxesMatchConfig,
  type DotsMatchPlayerCount,
} from './match-config'

export interface DotsAndBoxesConfigViewProps {
  readonly header: ReactNode
  readonly onStart: (payload: {
    readonly config: DotsAndBoxesMatchConfig
    readonly save: string
  }) => void
}

type FirstPlayerChoice = DotsAndBoxesSeat | 'random'

export function DotsAndBoxesConfigView({ header, onStart }: DotsAndBoxesConfigViewProps) {
  const [playerCount, setPlayerCount] = useState<DotsMatchPlayerCount>(2)
  const [boxSize, setBoxSize] = useState<DotsBoardSize>(12)
  const [firstChoice, setFirstChoice] = useState<FirstPlayerChoice>('random')
  const [activeSeatId, setActiveSeatId] = useState<DotsAndBoxesSeat | null>(null)
  const [lastSeatId, setLastSeatId] = useState<DotsAndBoxesSeat | null>(null)
  const [verifications, setVerifications] = useState<SeatVerificationMap>({})

  const activeSeats = DOTS_AND_BOXES_SEATS.slice(0, playerCount)
  const setup = useSeatSetup({
    seatIds: DOTS_AND_BOXES_SEATS,
    defaultYouSeat: 'red',
    activeSeatIds: activeSeats,
  })
  const activeAssignments = setup.seats.filter((seat) => activeSeats.includes(seat.id))
  const byId = new Map(activeAssignments.map((seat) => [seat.id, seat]))
  const humanCount = activeAssignments.filter((seat) => seat.type === 'human').length
  const issues = collectSeatIssues(activeAssignments, verifications)
  const testContext = useMemo<AiGameTestContext>(() => {
    const seats = activeSeats.map((id) => ({ id, type: 'algorithm' as const }))
    function createGame(firstPlayer: DotsAndBoxesSeat) {
      return createDotsAndBoxesGame({ boxSize, seats, youSeat: null, firstPlayer })
    }
    const schemaGame = createGame(activeSeats[0])
    return {
      gameId: 'dots-and-boxes',
      gameName: '方格大战',
      rulesSummary: DOTS_AND_BOXES_RULES_SUMMARY,
      parseAction: (raw) => schemaGame.parseAction(raw),
      createPosition: (playerId) => {
        const seat = activeSeats.includes(playerId as DotsAndBoxesSeat)
          ? (playerId as DotsAndBoxesSeat)
          : activeSeats[0]
        const game = createGame(seat)
        return createAiTestPosition(game, game.createInitialState(), playerId)
      },
    }
    // activeSeats 由 playerCount 派生；boxSize 影响样例局面。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerCount, boxSize])

  const seatEntries: readonly MatchSeatEntry<DotsAndBoxesSeat>[] = activeSeats.map(
    (seat) => ({
      id: seat,
      label: DOTS_SEAT_META[seat].label,
      badge: <SeatBadge seat={seat} className="size-10" />,
    }),
  )
  const lastSeat = seatEntries.find((seat) => seat.id === lastSeatId)
  const lastAssignment = lastSeatId === null ? undefined : byId.get(lastSeatId)
  const verification = lastSeatId === null ? undefined : verifications[lastSeatId]

  function changePlayerCount(next: DotsMatchPlayerCount) {
    setPlayerCount(next)
    if (firstChoice !== 'random' && !DOTS_AND_BOXES_SEATS.slice(0, next).includes(firstChoice)) {
      setFirstChoice('random')
    }
    if (lastSeatId !== null && !DOTS_AND_BOXES_SEATS.slice(0, next).includes(lastSeatId)) {
      setActiveSeatId(null)
    }
  }

  function openSeat(id: DotsAndBoxesSeat) {
    setLastSeatId(id)
    setActiveSeatId(id)
  }

  function closeSeat() {
    setActiveSeatId(null)
  }

  function start() {
    if (issues.length > 0) {
      return
    }
    const seats = setup.seats.slice(0, playerCount)
    const firstPlayer =
      firstChoice === 'random' || !activeSeats.includes(firstChoice)
        ? pickRandomSeat(activeSeats)
        : firstChoice
    const config: DotsAndBoxesMatchConfig = {
      boxSize,
      seats,
      youSeat: setup.youSeat,
      firstPlayer,
    }
    const game = createDotsAndBoxesGame(config)
    onStart({ config, save: game.serialize(game.createInitialState()) })
  }

  function changeVerification(seatId: DotsAndBoxesSeat, ai: AiSeatConfig | undefined) {
    setup.setSeatAi(seatId, ai)
  }

  function clearVerification(seatId: DotsAndBoxesSeat) {
    setVerifications((current) => {
      if (!(seatId in current)) {
        return current
      }
      const next = { ...current }
      delete next[seatId]
      return next
    })
  }

  const summary = (
    <div className="flex flex-col gap-1">
      <p className="text-sm">
        {playerCount} 人 · {boxSize}×{boxSize} 棋格
      </p>
      <p className="text-xs text-muted-foreground">
        {humanCount === 0
          ? '全自动对弈'
          : `${humanCount} 位真人 · ${playerCount - humanCount} 个非人类席位`}
      </p>
      <p className="text-xs text-muted-foreground">
        {firstChoice === 'random'
          ? '先手 · 开局随机'
          : `先手 · ${DOTS_SEAT_META[firstChoice].label}`}
      </p>
      <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
        {activeSeats.map((seat) => {
          const assignment = byId.get(seat)
          if (assignment === undefined) {
            return null
          }
          const meta = SEAT_KIND_META[assignment.type]
          const accent = SEAT_ACCENT_CLASS[meta.accent]
          return (
            <li key={seat} className="flex items-center gap-1.5">
              <span>{DOTS_SEAT_META[seat].label}</span>
              <span>·</span>
              <span className={accent.text}>{assignment.name ?? meta.label}</span>
              {setup.youSeat === seat ? <span>（房主）</span> : null}
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
        onStart={start}
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
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold tracking-tight">玩家人数</h2>
          <div className="flex flex-wrap gap-2">
            {DOTS_MATCH_PLAYER_COUNTS.map((count) => (
              <Button
                key={count}
                variant={playerCount === count ? 'default' : 'outline'}
                aria-pressed={playerCount === count}
                onClick={() => changePlayerCount(count)}
              >
                {count} 人
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            席位按红、蓝、绿、黄的顺序启用；每个席位都可以独立选择接入方式。
          </p>
        </div>

        <MatchSeatSetup<DotsAndBoxesSeat>
          seats={seatEntries}
          assignments={activeAssignments}
          youSeat={setup.youSeat}
          onConfigure={openSeat}
        />

        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold tracking-tight">先手</h2>
          <div className="flex flex-wrap gap-2">
            {activeSeats.map((seat) => (
              <Button
                key={seat}
                variant={firstChoice === seat ? 'default' : 'outline'}
                aria-pressed={firstChoice === seat}
                onClick={() => setFirstChoice(seat)}
              >
                {DOTS_SEAT_META[seat].label}
              </Button>
            ))}
            <Button
              variant={firstChoice === 'random' ? 'default' : 'outline'}
              aria-pressed={firstChoice === 'random'}
              onClick={() => setFirstChoice('random')}
            >
              随机
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            先手在开局时抽定，也可以直接指定某个席位。
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold tracking-tight">棋盘尺寸</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DOTS_BOARD_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                aria-pressed={boxSize === size}
                onClick={() => setBoxSize(size)}
                className={[
                  'flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors duration-300 ease-out',
                  boxSize === size ? 'border-primary bg-primary/5' : 'hover:bg-muted',
                ].join(' ')}
              >
                <span className="text-sm font-medium">
                  {size}×{size}
                </span>
                <span className="text-xs text-muted-foreground">
                  {size + 1}×{size + 1} 点阵
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          {DOTS_AND_BOXES_RULES_SUMMARY}
        </div>
      </MatchConfigLayout>
    </div>
  )

  const panel =
    lastSeat !== undefined && lastAssignment !== undefined ? (
      <SeatConfigPanel<DotsAndBoxesSeat>
        key={lastSeat.id}
        seat={lastSeat}
        assignment={lastAssignment}
        isHost={setup.youSeat === lastSeat.id}
        testContext={testContext}
        verification={verification}
        onTypeChange={(type) => {
          setup.setSeatType(lastSeat.id, type)
          clearVerification(lastSeat.id)
        }}
        onNameChange={(name) => setup.setSeatName(lastSeat.id, name)}
        onAiChange={(ai) => changeVerification(lastSeat.id, ai)}
        onVerified={(next) => {
          setVerifications((current) => ({ ...current, [lastSeat.id]: next }))
        }}
        onMakeHost={() => {
          setup.setSeatType(lastSeat.id, 'human')
          clearVerification(lastSeat.id)
          setup.setYouSeat(lastSeat.id)
        }}
        onClose={closeSeat}
      />
    ) : null

  return <ConfigDeck open={activeSeatId !== null} main={main} panel={panel} />
}