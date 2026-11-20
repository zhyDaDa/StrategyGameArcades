import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DOTS_AND_BOXES_RULES_SUMMARY,
  DOTS_MATCH_PLAYER_COUNTS,
  createDotsAndBoxesGame,
  type DotsAndBoxesMatchConfig,
  type DotsMatchPlayerCount,
  type DotsSeatType,
} from './match-config'
import {
  DOTS_AND_BOXES_SEATS,
  DOTS_BOARD_SIZES,
  type DotsAndBoxesSeat,
  type DotsBoardSize,
} from '../domain/types'
import { DOTS_SEAT_META } from '../ui/seat-meta'
import { SeatBadge } from '../ui/SeatBadge'

export interface DotsAndBoxesConfigViewProps {
  readonly onStart: (payload: {
    readonly config: DotsAndBoxesMatchConfig
    readonly save: string
  }) => void
}

const DEFAULT_SEAT_TYPES: Record<DotsAndBoxesSeat, DotsSeatType> = {
  red: 'human',
  blue: 'ai',
  green: 'ai',
  yellow: 'ai',
}

export function DotsAndBoxesConfigView({ onStart }: DotsAndBoxesConfigViewProps) {
  const [playerCount, setPlayerCount] = useState<DotsMatchPlayerCount>(2)
  const [seatTypes, setSeatTypes] = useState(DEFAULT_SEAT_TYPES)
  const [youSeat, setYouSeat] = useState<DotsAndBoxesSeat>('red')
  const [boxSize, setBoxSize] = useState<DotsBoardSize>(12)

  const activeSeats = DOTS_AND_BOXES_SEATS.slice(0, playerCount)
  const humanCount = activeSeats.filter((seat) => seatTypes[seat] === 'human').length

  function changePlayerCount(next: DotsMatchPlayerCount) {
    const nextSeats = DOTS_AND_BOXES_SEATS.slice(0, next)
    const nextTypes = { ...seatTypes }
    if (!nextSeats.some((seat) => nextTypes[seat] === 'human')) {
      nextTypes[nextSeats[0]] = 'human'
    }
    const nextYouSeat =
      nextSeats.includes(youSeat) && nextTypes[youSeat] === 'human'
        ? youSeat
        : nextSeats.find((seat) => nextTypes[seat] === 'human') ?? nextSeats[0]

    setSeatTypes(nextTypes)
    setYouSeat(nextYouSeat)
    setPlayerCount(next)
  }

  function changeSeatType(seat: DotsAndBoxesSeat, type: DotsSeatType) {
    const nextTypes = { ...seatTypes, [seat]: type }
    if (type === 'ai') {
      const remainingHumans = activeSeats.filter((item) => nextTypes[item] === 'human')
      if (remainingHumans.length === 0) {
        return
      }
      if (youSeat === seat) {
        setYouSeat(remainingHumans[0])
      }
    }
    setSeatTypes(nextTypes)
  }

  function start() {
    const seats = activeSeats.map((id) => ({ id, type: seatTypes[id] }))
    const firstPlayer = activeSeats[Math.floor(Math.random() * activeSeats.length)]
    const config: DotsAndBoxesMatchConfig = { boxSize, seats, youSeat, firstPlayer }
    const game = createDotsAndBoxesGame(config)
    onStart({ config, save: game.serialize(game.createInitialState()) })
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex flex-col gap-8">
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
            席位按红、蓝、绿、黄的顺序启用；至少需要一位玩家。
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold tracking-tight">席位</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeSeats.map((seat) => {
              const meta = DOTS_SEAT_META[seat]
              const type = seatTypes[seat]
              return (
                <div
                  key={seat}
                  className={[
                    'flex flex-col rounded-xl border p-4 transition-colors duration-300 ease-out',
                    type === 'human' ? 'bg-card' : 'bg-muted/30',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <SeatBadge seat={seat} className="size-10" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-medium">{meta.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {type === 'ai' ? 'AI 控制' : youSeat === seat ? '你在这里' : '本机玩家'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border p-0.5">
                      {(['human', 'ai'] as const).map((value) => {
                        const aiDisabled = value === 'ai' && type === 'human' && humanCount === 1
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={type === value}
                            disabled={aiDisabled}
                            title={aiDisabled ? '至少需要保留一位玩家' : undefined}
                            onClick={() => changeSeatType(seat, value)}
                            className={[
                              'rounded-md px-3 py-1 text-xs font-medium transition-colors duration-300 ease-out',
                              type === value
                                ? 'bg-primary text-primary-foreground'
                                : aiDisabled
                                  ? 'cursor-not-allowed text-muted-foreground/40'
                                  : 'text-muted-foreground hover:text-foreground',
                            ].join(' ')}
                          >
                            {value === 'human' ? '玩家' : 'AI'}
                          </button>
                        )
                      })}
                    </div>

                    {type === 'human' ? (
                      <button
                        type="button"
                        disabled={youSeat === seat}
                        onClick={() => setYouSeat(seat)}
                        className={[
                          'rounded-md border px-2.5 py-1 text-xs transition-colors duration-300 ease-out',
                          youSeat === seat
                            ? 'cursor-default border-primary/50 bg-primary/5 text-primary'
                            : 'hover:bg-muted',
                        ].join(' ')}
                      >
                        {youSeat === seat ? '你的席位' : '坐这里'}
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
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
                <span className="text-sm font-medium">{size}×{size}</span>
                <span className="text-xs text-muted-foreground">{size + 1}×{size + 1} 点阵</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          {DOTS_AND_BOXES_RULES_SUMMARY}
        </div>
      </div>

      <aside className="flex h-fit flex-col gap-4 rounded-xl border p-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">
            MATCH / 本局
          </p>
          <p className="text-sm">
            {playerCount} 人 · {boxSize}×{boxSize} 棋格
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
            {activeSeats.map((seat) => (
              <li key={seat}>
                {DOTS_SEAT_META[seat].label} ·{' '}
                {seatTypes[seat] === 'ai' ? 'AI' : youSeat === seat ? '你' : '本机玩家'}
              </li>
            ))}
          </ul>
        </div>
        <Button size="lg" onClick={start}>
          开始对局
        </Button>
        <p className="text-xs text-muted-foreground">
          先手在开局时随机决定。开始后会写入本局初始快照；刷新页面可继续当前局面。
        </p>
      </aside>
    </section>
  )
}