import { SlidersHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { SEAT_ACCENT_CLASS, SEAT_KIND_META } from '@/presentation/match-setup/seat-kinds'
import type { SeatAssignment } from '@/presentation/match-setup/types'
import { describeAiConfig } from '@/presentation/match-setup/ai-config'
import { SeatKindIcon } from '../SeatKindIcon/SeatKindIcon'

export interface MatchSeatEntry<S extends string> {
  readonly id: S
  readonly label: string
  readonly hint?: string
  readonly badge: ReactNode
}

export interface MatchSeatSetupProps<S extends string> {
  readonly seats: readonly MatchSeatEntry<S>[]
  readonly assignments: readonly SeatAssignment<S>[]
  readonly youSeat: S | null
  readonly onConfigure: (id: S) => void
}

/**
 * 通用席位概览：显示每个席位当前由什么接入方式驱动，并把具体设置收进
 * 席位自己的配置页。这里不再内联切换人类 / AI，避免两套配置入口。
 */
export function MatchSeatSetup<S extends string>({
  seats,
  assignments,
  youSeat,
  onConfigure,
}: MatchSeatSetupProps<S>) {
  const byId = new Map(assignments.map((seat) => [seat.id, seat]))

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold tracking-tight">席位</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {seats.map((seat) => {
          const assignment = byId.get(seat.id)
          if (assignment === undefined) {
            return null
          }
          const meta = SEAT_KIND_META[assignment.type]
          const accent = SEAT_ACCENT_CLASS[meta.accent]
          const label =
            assignment.name ??
            (assignment.ai !== undefined ? describeAiConfig(assignment.ai) : meta.label)

          return (
            <div
              key={seat.id}
              className="flex flex-col gap-4 rounded-xl border bg-card p-4 transition-colors duration-300 ease-out"
            >
              <div className="flex items-center gap-3">
                {seat.badge}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">{seat.label}</span>
                  {seat.hint !== undefined ? (
                    <span className="text-xs text-muted-foreground">{seat.hint}</span>
                  ) : null}
                  <span className="mt-1 flex items-center gap-1.5 text-xs">
                    <span
                      className={[
                        'flex size-4 items-center justify-center rounded',
                        accent.softBg,
                        accent.text,
                      ].join(' ')}
                    >
                      <SeatKindIcon type={assignment.type} className="size-3" />
                    </span>
                    <span className={accent.text}>
                      {label}
                    </span>
                    {youSeat === seat.id ? (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                        房主
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{meta.hint}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onConfigure(seat.id)}
                >
                  <SlidersHorizontal className="size-3.5" />
                  配置该玩家
                </Button>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        每个席位可以选择人类、算法、大模型或小模型；点击「配置该玩家」进入该席位的接入设置。
      </p>
    </div>
  )
}