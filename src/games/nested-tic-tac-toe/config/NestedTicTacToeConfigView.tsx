import { useState } from 'react'
import { PlayerBadge } from '@/components/game/PlayerBadge/PlayerBadge'
import { Button } from '@/components/ui/button'
import { PLAYER_SEAT_META, type PlayerSeatMeta } from '@/presentation/player-seats/player-seats'
import { NESTED_SIDES, type NestedTicTacToeSide } from '../domain/types'
import {
  NESTED_TIC_TAC_TOE_RULES_SUMMARY,
  createNestedTicTacToeGame,
  type NestedSeatType,
  type NestedTicTacToeMatchConfig,
} from './match-config'

export interface NestedTicTacToeConfigViewProps {
  readonly onStart: (payload: {
    readonly config: NestedTicTacToeMatchConfig
    readonly save: string
  }) => void
}

const DEFAULT_SEAT_TYPES: Record<NestedTicTacToeSide, NestedSeatType> = {
  red: 'human',
  blue: 'ai',
}

const SIDE_HINT: Record<NestedTicTacToeSide, string> = {
  red: '先手 · 圆',
  blue: '后手 · 叉',
}

export function NestedTicTacToeConfigView({ onStart }: NestedTicTacToeConfigViewProps) {
  const [seatTypes, setSeatTypes] = useState(DEFAULT_SEAT_TYPES)
  const [youSeat, setYouSeat] = useState<NestedTicTacToeSide>('red')
  const humanCount = NESTED_SIDES.filter((side) => seatTypes[side] === 'human').length

  function changeSeatType(side: NestedTicTacToeSide, type: NestedSeatType) {
    if (type === 'ai' && seatTypes[side] === 'human' && humanCount === 1) {
      return
    }
    const nextTypes = { ...seatTypes, [side]: type }
    setSeatTypes(nextTypes)
    if (type === 'ai' && youSeat === side) {
      const nextYou = NESTED_SIDES.find((item) => item !== side && nextTypes[item] === 'human')
      if (nextYou !== undefined) {
        setYouSeat(nextYou)
      }
    }
  }

  function start() {
    const config: NestedTicTacToeMatchConfig = {
      seats: NESTED_SIDES.map((id) => ({ id, type: seatTypes[id] })),
      youSeat,
    }
    const game = createNestedTicTacToeGame()
    onStart({ config, save: game.serialize(game.createInitialState()) })
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold tracking-tight">席位</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {NESTED_SIDES.map((side) => {
              const meta: PlayerSeatMeta = PLAYER_SEAT_META[side]
              const type = seatTypes[side]
              return (
                <div
                  key={side}
                  className={[
                    'flex flex-col rounded-xl border p-4 transition-colors duration-300 ease-out',
                    type === 'human' ? 'bg-card' : 'bg-muted/30',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <PlayerBadge symbol={meta.symbol} color={meta.color} className="size-10" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-medium">{meta.label}</span>
                      <span className="text-xs text-muted-foreground">{SIDE_HINT[side]}</span>
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
                            onClick={() => changeSeatType(side, value)}
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
                        disabled={youSeat === side}
                        onClick={() => setYouSeat(side)}
                        className={[
                          'rounded-md border px-2.5 py-1 text-xs transition-colors duration-300 ease-out',
                          youSeat === side
                            ? 'cursor-default border-primary/50 bg-primary/5 text-primary'
                            : 'hover:bg-muted',
                        ].join(' ')}
                      >
                        {youSeat === side ? '你的席位' : '坐这里'}
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            红方固定先手；至少保留一位本机玩家，另一位可以交给启发式 AI。
          </p>
        </div>

        <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          {NESTED_TIC_TAC_TOE_RULES_SUMMARY}
        </div>
      </div>

      <aside className="flex h-fit flex-col gap-4 rounded-xl border p-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">
            MATCH / 本局
          </p>
          <p className="text-sm">9×9 · 九宫争夺</p>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
            {NESTED_SIDES.map((side) => (
              <li key={side}>
                {PLAYER_SEAT_META[side].label} ·{' '}
                {seatTypes[side] === 'ai' ? 'AI' : youSeat === side ? '你' : '本机玩家'}
              </li>
            ))}
          </ul>
        </div>
        <Button size="lg" onClick={start}>
          开始对局
        </Button>
        <p className="text-xs text-muted-foreground">
          红方先行。开始后会写入本局初始快照；刷新页面可继续当前局面。
        </p>
      </aside>
    </section>
  )
}