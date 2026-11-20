import { AnimatePresence, motion } from 'motion/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { dotsMotion } from '../motion/timings'
import type { DotsPlayerViewModel } from './dots-and-boxes-view-model'
import { SeatBadge } from './SeatBadge'

export interface DotsPlayersPanelProps {
  readonly players: readonly DotsPlayerViewModel[]
}

/** 行高与间距：当前玩家衬底靠这两个值计算纵向位置。 */
const ROW_HEIGHT_PX = 64
const ROW_GAP_PX = 8

/** 玩家列表：一个独立的衬底在行间移动，左侧 SVG 三角箭头标记当前玩家。 */
export function DotsPlayersPanel({ players }: DotsPlayersPanelProps) {
  const currentIndex = players.findIndex((player) => player.isCurrent)
  const current = currentIndex >= 0 ? players[currentIndex] : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>玩家</CardTitle>
        <CardDescription>每占领一格得 1 分；得分后继续行动。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative flex flex-col gap-2">
          <AnimatePresence>
            {current !== null ? (
              <motion.div
                key="current-player-slab"
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 rounded-lg border border-primary/40 bg-primary/10"
                style={{ height: ROW_HEIGHT_PX }}
                initial={{ opacity: 0, top: currentIndex * (ROW_HEIGHT_PX + ROW_GAP_PX) }}
                animate={{ opacity: 1, top: currentIndex * (ROW_HEIGHT_PX + ROW_GAP_PX) }}
                exit={{ opacity: 0 }}
                transition={{
                  top: dotsMotion.slabMove,
                  opacity: { duration: 0.24 },
                }}
              >
                <motion.svg
                  key={`arrow-${current.seat}-${current.pulseVersion ?? 'idle'}`}
                  viewBox="0 0 12 16"
                  className="absolute top-1/2 left-2 h-4 w-3 -translate-y-1/2 text-primary"
                  initial={current.pulseVersion !== null ? { scale: 1 } : false}
                  animate={current.pulseVersion !== null ? { scale: [1, 1.5, 1] } : { scale: 1 }}
                  transition={dotsMotion.arrowPulse}
                >
                  <path d="M0 0 L12 8 L0 16 Z" fill="currentColor" />
                </motion.svg>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {players.map((player) => (
            <div
              key={player.seat}
              className="relative z-10 flex h-16 items-center gap-2 rounded-lg pr-2 pl-9"
            >
              <SeatBadge seat={player.seat} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{player.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {player.isThinking ? '思考中…' : player.label}
                </span>
              </div>
              <motion.span
                key={`score-${player.seat}-${player.pulseVersion ?? 'idle'}`}
                className="text-lg font-semibold tabular-nums"
                initial={player.pulseVersion !== null ? { scale: 1 } : false}
                animate={player.pulseVersion !== null ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={dotsMotion.scorePulse}
              >
                {player.score}
              </motion.span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}