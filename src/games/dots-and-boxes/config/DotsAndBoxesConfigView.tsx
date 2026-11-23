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
import { Button } from '@/components/ui/button'
import { SEAT_ACCENT_CLASS, SEAT_KIND_META } from '@/presentation/match-setup/seat-kinds'
import { pickRandomSeat } from '@/presentation/match-setup/seats'
import { useSeatSetup } from '@/presentation/match-setup/useSeatSetup'
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
  const [drafts, setDrafts] = useState<Record<string, SeatDraft>>({})

  const activeSeats = DOTS_AND_BOXES_SEATS.slice(0, playerCount)
  const setup = useSeatSetup({
    seatIds: DOTS_AND_BOXES_SEATS,
    defaultYouSeat: 'red',
    activeSeatIds: activeSeats,
  })
  const activeAssignments = setup.seats.filter((seat) => activeSeats.includes(seat.id))
  const byId = new Map(activeAssignments.map((seat) => [seat.id, seat]))
  const humanCount = activeAssignments.filter((seat) => seat.type === 'human').length
  const unplayable = activeAssignments.filter((seat) => !SEAT_KIND_META[seat.type].playable)

  const seatEntries: readonly MatchSeatEntry<DotsAndBoxesSeat>[] = activeSeats.map(
    (seat) => ({
      id: seat,
      label: DOTS_SEAT_META[seat].label,
      badge: <SeatBadge seat={seat} className="size-10" />,
    }),
  )
  const lastSeat = seatEntries.find((seat) => seat.id === lastSeatId)
  const lastAssignment = lastSeatId === null ? undefined : byId.get(lastSeatId)
  const draft =
    lastSeatId === null ? EMPTY_SEAT_DRAFT : drafts[lastSeatId] ?? EMPTY_SEAT_DRAFT

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

  function updateDraft(id: DotsAndBoxesSeat, patch: Partial<SeatDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] ?? EMPTY_SEAT_DRAFT), ...patch },
    }))
  }

  function start() {
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
        draft={draft}
        onTypeChange={(type) => setup.setSeatType(lastSeat.id, type)}
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