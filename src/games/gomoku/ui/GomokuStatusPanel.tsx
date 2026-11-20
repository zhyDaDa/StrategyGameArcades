import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GomokuSide } from '../domain/types'
import {
  sideLabel,
  type GomokuPendingUndoViewModel,
  type GomokuResultViewModel,
} from './gomoku-view-model'

export interface GomokuStatusPanelProps {
  readonly currentPlayer: GomokuSide | null
  readonly thinkingSide: GomokuSide | null
  readonly pendingUndo: GomokuPendingUndoViewModel | null
  readonly result: GomokuResultViewModel | null
  readonly moveCount: number
}

export function GomokuStatusPanel({
  currentPlayer,
  thinkingSide,
  pendingUndo,
  result,
  moveCount,
}: GomokuStatusPanelProps) {
  const status = describeStatus(currentPlayer, thinkingSide, pendingUndo)
  const indicatorSide = result !== null ? result.winner : status.indicatorSide

  return (
    <Card>
      <CardHeader>
        <CardTitle>{result === null ? '对局进行中' : '对局结束'}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {result === null ? (
          <div className="flex items-start gap-3">
            <StoneIndicator side={indicatorSide} />
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

        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>{result === null ? `第 ${moveCount + 1} 手` : `共 ${moveCount} 手`}</span>
          <span>{result === null ? `轮到 ${sideLabel(currentPlayer)}` : ' '}</span>
        </div>
      </CardContent>
    </Card>
  )
}

interface StatusDescription {
  readonly title: string
  readonly detail: string
  readonly indicatorSide: GomokuSide | null
}

function describeStatus(
  currentPlayer: GomokuSide | null,
  thinkingSide: GomokuSide | null,
  pendingUndo: GomokuPendingUndoViewModel | null,
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
    title: `轮到${sideLabel(currentPlayer)}`,
    detail: currentPlayer === null ? '等待开局' : '点击棋盘上的空位落子',
    indicatorSide: currentPlayer,
  }
}

function StoneIndicator({ side }: { readonly side: GomokuSide | null }) {
  if (side === null) {
    return <span aria-hidden="true" className="mt-0.5 size-4 shrink-0 rounded-full bg-muted" />
  }
  return (
    <span
      aria-hidden="true"
      className={[
        'mt-0.5 size-4 shrink-0 rounded-full',
        side === 'black' ? 'bg-zinc-900' : 'bg-zinc-50 ring-1 ring-border',
      ].join(' ')}
    />
  )
}