import { MatchConfigLayout } from '@/components/game/MatchConfigLayout/MatchConfigLayout'
import {
  MatchSeatSetup,
  type MatchSeatEntry,
} from '@/components/game/MatchSeatSetup/MatchSeatSetup'
import { useSeatSetup } from '@/presentation/match-setup/useSeatSetup'
import type { SeatMatchConfig } from '@/presentation/match-setup/types'

export interface TwoSeatMatchConfigViewProps<S extends string> {
  readonly seats: readonly [MatchSeatEntry<S>, MatchSeatEntry<S>]
  readonly sideOptions: readonly { readonly id: S; readonly label: string }[]
  readonly sideLabel: string
  readonly sideHint: string
  readonly randomSideLabel: string
  readonly rulesSummary: string
  readonly onStart: (config: SeatMatchConfig<S>) => void
}

/**
 * 双席位对局配置：席位可独立设为玩家 / AI（允许 AI 对 AI），
 * 另有「执子」快捷选择，用来快速指定本方席位并把对手设为 AI。
 */
export function TwoSeatMatchConfigView<S extends string>({
  seats,
  sideOptions,
  sideLabel,
  sideHint,
  randomSideLabel,
  rulesSummary,
  onStart,
}: TwoSeatMatchConfigViewProps<S>) {
  const setup = useSeatSetup({
    seatIds: seats.map((seat) => seat.id),
    defaultHumanSeat: seats[0].id,
  })
  const typeById = new Map(setup.seats.map((seat) => [seat.id, seat.type]))
  const humanCount = setup.seats.filter((seat) => seat.type === 'human').length

  function start() {
    onStart({ seats: setup.seats, youSeat: setup.youSeat })
  }

  return (
    <MatchConfigLayout
      onStart={start}
      startLabel={humanCount === 0 ? '开始观战' : '开始对局'}
      summary={
        <div className="flex flex-col gap-1">
          <p className="text-sm">
            {humanCount === 0
              ? 'AI 对 AI · 自动对弈'
              : `${humanCount} 位真人 · ${seats.length - humanCount} 位 AI`}
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
            {seats.map((seat) => (
              <li key={seat.id}>
                {seat.label} ·{' '}
                {typeById.get(seat.id) === 'ai'
                  ? 'AI'
                  : setup.youSeat === seat.id
                    ? '你'
                    : '本机玩家'}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <MatchSeatSetup
        seats={seats}
        assignments={setup.seats}
        youSeat={setup.youSeat}
        onSeatTypeChange={setup.setSeatType}
        onYouSeatChange={setup.setYouSeat}
        sideChoice={{
          label: sideLabel,
          hint: sideHint,
          options: sideOptions,
          randomLabel: randomSideLabel,
          onSelect: setup.applyYourSide,
        }}
      />

      <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
        {rulesSummary}
      </div>
    </MatchConfigLayout>
  )
}