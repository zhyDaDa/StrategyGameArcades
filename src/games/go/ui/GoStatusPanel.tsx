import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GoCaptures, GoSide } from '../domain/types'
import {
  sideLabel,
  type GoPendingUndoViewModel,
  type GoResultViewModel,
} from './go-view-model'

export interface GoStatusPanelProps {
  readonly currentPlayer: GoSide | null
  readonly thinkingSide: GoSide | null
  readonly passedSide: GoSide | null
  readonly captures: GoCaptures
  readonly pendingUndo: GoPendingUndoViewModel | null
  readonly result: GoResultViewModel | null
  readonly moveCount: number
}

export function GoStatusPanel({
  currentPlayer,
  thinkingSide,
  passedSide,
  captures,
  pendingUndo,
  result,
  moveCount,
}: GoStatusPanelProps) {
  const status = describeStatus(currentPlayer, thinkingSide, pendingUndo, passedSide)
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

        <div className="grid grid-cols-2 gap-2">
          <CaptureCount side="black" count={captures.black} active={result === null && currentPlayer === 'black'} />
          <CaptureCount side="white" count={captures.white} active={result === null && currentPlayer === 'white'} />
        </div>

        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>{result === null ? `第 ${moveCount + 1} 手` : `共 ${moveCount} 手`}</span>
          <span>{result === null ? `轮到 ${sideLabel(currentPlayer)}` : '中国规则 · 白贴 7.5 目'}</span>
        </div>
      </CardContent>
    </Card>
  )
}

interface StatusDescription {
  readonly title: string
  readonly detail: string
  readonly indicatorSide: GoSide | null
}

function describeStatus(
  currentPlayer: GoSide | null,
  thinkingSide: GoSide | null,
  pendingUndo: GoPendingUndoViewModel | null,
  passedSide: GoSide | null,
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
  if (passedSide !== null) {
    return {
      title: `轮到${sideLabel(currentPlayer)}`,
      detail: `${sideLabel(passedSide)}停一手`,
      indicatorSide: currentPlayer,
    }
  }
  return {
    title: `轮到${sideLabel(currentPlayer)}`,
    detail: currentPlayer === null ? '等待开局' : '点击交叉点落子',
    indicatorSide: currentPlayer,
  }
}

function CaptureCount({
  side,
  count,
  active,
}: {
  readonly side: GoSide
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
      <StoneIndicator side={side} />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{sideLabel(side)}提子</span>
        <span className="text-lg font-semibold tabular-nums leading-none">{count}</span>
      </div>
    </div>
  )
}

function StoneIndicator({ side }: { readonly side: GoSide | null }) {
  if (side === null) {
    return <span aria-hidden="true" className="size-4 shrink-0 rounded-full bg-muted" />
  }
  return (
    <span
      aria-hidden="true"
      className={[
        'size-4 shrink-0 rounded-full',
        side === 'black' ? 'bg-zinc-900' : 'bg-zinc-50 ring-1 ring-border',
      ].join(' ')}
    />
  )
}