import { motion } from 'motion/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { motionTokens } from '@/presentation/motion/tokens'
import type { DotsPlayerViewModel } from './dots-and-boxes-view-model'
import { SeatBadge } from './SeatBadge'

export interface DotsPlayersPanelProps {
  readonly players: readonly DotsPlayerViewModel[]
}

/** 玩家列表：颜色 + 符号、名字、分数，以及随回合移动的「当前玩家」条。 */
export function DotsPlayersPanel({ players }: DotsPlayersPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>玩家</CardTitle>
        <CardDescription>每占领一格得 1 分；得分后继续行动。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {players.map((player) => (
            <div
              key={player.seat}
              className={[
                'flex flex-col rounded-lg border p-2.5 transition-colors',
                player.isCurrent ? 'border-primary/50 bg-primary/5' : 'bg-card',
              ].join(' ')}
            >
              <div className="flex items-center gap-2">
                <SeatBadge seat={player.seat} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{player.name}</span>
                  <span className="text-[10px] text-muted-foreground">{player.label}</span>
                </div>
                <motion.span
                  key={`score-${player.seat}-${player.pulseVersion ?? 'idle'}`}
                  className="text-lg font-semibold tabular-nums"
                  initial={player.pulseVersion !== null ? { scale: 1 } : false}
                  animate={player.pulseVersion !== null ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                  transition={{
                    duration: motionTokens.duration.deliberate,
                    ease: motionTokens.ease.out,
                  }}
                >
                  {player.score}
                </motion.span>
              </div>

              {player.isCurrent ? (
                <motion.div
                  layoutId="dots-current-player"
                  className="mt-2 rounded-md bg-primary px-2 py-1 text-left text-[10px] font-medium text-primary-foreground"
                  transition={{ duration: motionTokens.duration.quick, ease: motionTokens.ease.out }}
                >
                  {player.isThinking ? '当前玩家 · 思考中' : '当前玩家'}
                </motion.div>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}