import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { SEAT_TYPES, type SeatAssignment, type SeatType } from '@/presentation/match-setup/types'

export interface MatchSeatEntry<S extends string> {
  readonly id: S
  readonly label: string
  readonly hint?: string
  readonly badge: ReactNode
}

export interface MatchSideChoice<S extends string> {
  readonly label: string
  readonly hint?: string
  readonly options: readonly { readonly id: S; readonly label: string }[]
  readonly randomLabel?: string
  readonly onSelect: (choice: S | 'random') => void
}

export interface MatchSeatSetupProps<S extends string> {
  readonly seats: readonly MatchSeatEntry<S>[]
  readonly assignments: readonly SeatAssignment<S>[]
  readonly youSeat: S | null
  readonly onSeatTypeChange: (id: S, type: SeatType) => void
  readonly onYouSeatChange: (id: S) => void
  readonly sideChoice?: MatchSideChoice<S>
}

/**
 * 通用席位编辑器：每个席位独立切换「玩家 / AI」，并标记本机操作者的席位。
 * 不限制真人数量——全部设为 AI 时就是 AI 对 AI。
 */
export function MatchSeatSetup<S extends string>({
  seats,
  assignments,
  youSeat,
  onSeatTypeChange,
  onYouSeatChange,
  sideChoice,
}: MatchSeatSetupProps<S>) {
  const typeById = new Map(assignments.map((seat) => [seat.id, seat.type]))
  const humanCount = assignments.filter((seat) => seat.type === 'human').length

  return (
    <>
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold tracking-tight">席位</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {seats.map((seat) => {
            const type = typeById.get(seat.id)
            if (type === undefined) {
              return null
            }
            return (
              <div
                key={seat.id}
                className={[
                  'flex flex-col rounded-xl border p-4 transition-colors duration-300 ease-out',
                  type === 'human' ? 'bg-card' : 'bg-muted/30',
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  {seat.badge}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium">{seat.label}</span>
                    {seat.hint !== undefined ? (
                      <span className="text-xs text-muted-foreground">{seat.hint}</span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {type === 'ai' ? 'AI 控制' : youSeat === seat.id ? '你在这里' : '本机玩家'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-lg border p-0.5">
                    {SEAT_TYPES.map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={type === value}
                        onClick={() => onSeatTypeChange(seat.id, value)}
                        className={[
                          'rounded-md px-3 py-1 text-xs font-medium transition-colors duration-300 ease-out',
                          type === value
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                        ].join(' ')}
                      >
                        {value === 'human' ? '玩家' : 'AI'}
                      </button>
                    ))}
                  </div>

                  {type === 'human' ? (
                    <button
                      type="button"
                      disabled={youSeat === seat.id}
                      onClick={() => onYouSeatChange(seat.id)}
                      className={[
                        'rounded-md border px-2.5 py-1 text-xs transition-colors duration-300 ease-out',
                        youSeat === seat.id
                          ? 'cursor-default border-primary/50 bg-primary/5 text-primary'
                          : 'hover:bg-muted',
                      ].join(' ')}
                    >
                      {youSeat === seat.id ? '你的席位' : '坐这里'}
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
        {humanCount === 0 ? (
          <p className="text-xs text-muted-foreground">
            当前没有真人席位：开局后全部席位由 AI 自动对弈。
          </p>
        ) : null}
      </div>

      {sideChoice !== undefined ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold tracking-tight">{sideChoice.label}</h2>
          <div className="flex flex-wrap gap-2">
            {sideChoice.options.map((option) => (
              <Button
                key={option.id}
                variant={youSeat === option.id ? 'default' : 'outline'}
                aria-pressed={youSeat === option.id}
                onClick={() => {
                  if (youSeat !== option.id) {
                    sideChoice.onSelect(option.id)
                  }
                }}
              >
                {option.label}
              </Button>
            ))}
            <Button variant="outline" onClick={() => sideChoice.onSelect('random')}>
              {sideChoice.randomLabel ?? '随机'}
            </Button>
          </div>
          {sideChoice.hint !== undefined ? (
            <p className="text-xs text-muted-foreground">{sideChoice.hint}</p>
          ) : null}
        </div>
      ) : null}
    </>
  )
}