import { PlayerBadge } from '@/components/game/PlayerBadge/PlayerBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PLAYER_SEAT_META } from '@/presentation/player-seats/player-seats'
import { NESTED_SIDES, type NestedTicTacToeSide } from '../domain/types'
import {
  sideLabel,
  type NestedTicTacToePendingUndoViewModel,
  type NestedTicTacToeResultViewModel,
} from './nested-tic-tac-toe-view-model'

export interface NestedTicTacToeStatusPanelProps {
  readonly currentSide: NestedTicTacToeSide | null
  readonly thinkingSide: NestedTicTacToeSide | null
  readonly pendingUndo: NestedTicTacToePendingUndoViewModel | null
  readonly result: NestedTicTacToeResultViewModel | null
  readonly moveCount: number
  readonly capturedCounts: Record<NestedTicTacToeSide, number>
}

export function NestedTicTacToeStatusPanel({
  currentSide,
  thinkingSide,
  pendingUndo,
  result,
  moveCount,
  capturedCounts,
}: NestedTicTacToeStatusPanelProps) {
  const status = describeStatus(currentSide, thinkingSide, pendingUndo)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{result === null ? '对局进行中' : '对局结束'}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {result === null ? (
          <div className="flex items-start gap-3">
            <SideMark side={status.indicatorSide} className="size-8" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{status.title}</p>
              <p className="text-xs text-muted-foreground">{status.detail}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-2xl font-semibold tracking-tight">{result.title}</p>
            <p className="text-sm text-muted-foreground">{result.detail}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {NESTED_SIDES.map((side) => (
            <CapturedScore
              key={side}
              side={side}
              count={capturedCounts[side]}
              active={result === null && currentSide === side}
            />
          ))}
        </div>

        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>{result === null ? `第 ${moveCount + 1} 手` : `共 ${moveCount} 手`}</span>
          <span>{result === null ? `轮到 ${sideLabel(currentSide)}` : ' '}</span>
        </div>
      </CardContent>
    </Card>
  )
}

interface StatusDescription {
  readonly title: string
  readonly detail: string
  readonly indicatorSide: NestedTicTacToeSide | null
}

function describeStatus(
  currentSide: NestedTicTacToeSide | null,
  thinkingSide: NestedTicTacToeSide | null,
  pendingUndo: NestedTicTacToePendingUndoViewModel | null,
): StatusDescription {
  if (pendingUndo !== null) {
    return {
      title: `${sideLabel(pendingUndo.requester)}申请悔棋`,
      detail: pendingUndo.awaitingHuman
        ? `等待${sideLabel(pendingUndo.responder)}同意或拒绝`
        : `${sideLabel(pendingUndo.responder)}正在考虑，AI 会自动同意`,
      indicatorSide: pendingUndo.responder,
    }
  }
  if (thinkingSide !== null) {
    return {
      title: `${sideLabel(thinkingSide)}思考中`,
      detail: '最短思考时间结束后自动落子',
      indicatorSide: thinkingSide,
    }
  }
  return {
    title: `轮到${sideLabel(currentSide)}`,
    detail:
      currentSide === null
        ? '等待开局'
        : '在描边框内落子；目标宫已封盘时描边框会展开整盘',
    indicatorSide: currentSide,
  }
}

function CapturedScore({
  side,
  count,
  active,
}: {
  readonly side: NestedTicTacToeSide
  readonly count: number
  readonly active: boolean
}) {
  return (
    <div
      className={[
        'flex items-center gap-2 rounded-lg border px-3 py-2',
        active ? 'border-primary/50 bg-primary/5' : '',
      ].join(' ')}
    >
      <SideMark side={side} className="size-6" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">占领宫数</span>
        <span className="text-lg font-semibold tabular-nums leading-none">{count}</span>
      </div>
    </div>
  )
}

function SideMark({
  side,
  className,
}: {
  readonly side: NestedTicTacToeSide | null
  readonly className?: string
}) {
  if (side === null) {
    return <span aria-hidden="true" className={['shrink-0 rounded-md bg-muted', className ?? 'size-6'].join(' ')} />
  }
  const meta = PLAYER_SEAT_META[side]
  return <PlayerBadge symbol={meta.symbol} color={meta.color} className={className} />
}