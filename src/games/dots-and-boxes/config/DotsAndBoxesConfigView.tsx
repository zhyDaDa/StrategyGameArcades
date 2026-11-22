import { useState } from 'react'
import { MatchConfigLayout } from '@/components/game/MatchConfigLayout/MatchConfigLayout'
import {
  MatchSeatSetup,
  type MatchSeatEntry,
} from '@/components/game/MatchSeatSetup/MatchSeatSetup'
import { Button } from '@/components/ui/button'
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
  readonly onStart: (payload: {
    readonly config: DotsAndBoxesMatchConfig
    readonly save: string
  }) => void
}

type FirstPlayerChoice = DotsAndBoxesSeat | 'random'

export function DotsAndBoxesConfigView({ onStart }: DotsAndBoxesConfigViewProps) {
  const [playerCount, setPlayerCount] = useState<DotsMatchPlayerCount>(2)
  const [boxSize, setBoxSize] = useState<DotsBoardSize>(12)
  const [firstChoice, setFirstChoice] = useState<FirstPlayerChoice>('random')

  const activeSeats = DOTS_AND_BOXES_SEATS.slice(0, playerCount)
  const setup = useSeatSetup({
    seatIds: DOTS_AND_BOXES_SEATS,
    defaultHumanSeat: 'red',
    activeSeatIds: activeSeats,
  })
  const activeAssignments = setup.seats.filter((seat) => activeSeats.includes(seat.id))
  const typeById = new Map(activeAssignments.map((seat) => [seat.id, seat.type]))
  const humanCount = activeAssignments.filter((seat) => seat.type === 'human').length

  const seatEntries: readonly MatchSeatEntry<DotsAndBoxesSeat>[] = activeSeats.map(
    (seat) => ({
      id: seat,
      label: DOTS_SEAT_META[seat].label,
      badge: <SeatBadge seat={seat} className="size-10" />,
    }),
  )

  const sideOptions = activeSeats.map((seat) => ({
    id: seat,
    label: DOTS_SEAT_META[seat].label,
  }))

  function changePlayerCount(next: DotsMatchPlayerCount) {
    setPlayerCount(next)
    if (firstChoice !== 'random' && !DOTS_AND_BOXES_SEATS.slice(0, next).includes(firstChoice)) {
      setFirstChoice('random')
    }
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

  return (
    <MatchConfigLayout
      onStart={start}
      startLabel={humanCount === 0 ? '开始观战' : '开始对局'}
      summary={
        <div className="flex flex-col gap-1">
          <p className="text-sm">
            {playerCount} 人 · {boxSize}×{boxSize} 棋格
          </p>
          <p className="text-xs text-muted-foreground">
            {humanCount === 0
              ? 'AI 对 AI · 自动对弈'
              : `${humanCount} 位真人 · ${playerCount - humanCount} 位 AI`}
          </p>
          <p className="text-xs text-muted-foreground">
            {firstChoice === 'random'
              ? '先手 · 开局随机'
              : `先手 · ${DOTS_SEAT_META[firstChoice].label}`}
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
            {activeSeats.map((seat) => (
              <li key={seat}>
                {DOTS_SEAT_META[seat].label} ·{' '}
                {typeById.get(seat) === 'ai'
                  ? 'AI'
                  : setup.youSeat === seat
                    ? '你'
                    : '本机玩家'}
              </li>
            ))}
          </ul>
        </div>
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
          席位按红、蓝、绿、黄的顺序启用；每个席位都可以独立设为玩家或 AI。
        </p>
      </div>

      <MatchSeatSetup<DotsAndBoxesSeat>
        seats={seatEntries}
        assignments={activeAssignments}
        youSeat={setup.youSeat}
        onSeatTypeChange={setup.setSeatType}
        onYouSeatChange={setup.setYouSeat}
        sideChoice={{
          label: '你的席位',
          hint: '选择后该席位为真人、其余席位为 AI；也可以在上方席位自由调整，包括 AI 对 AI。',
          options: sideOptions,
          randomLabel: '随机席位',
          onSelect: setup.applyYourSide,
        }}
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
  )
}