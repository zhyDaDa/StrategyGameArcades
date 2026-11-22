import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { XiangqiSide } from '../domain/types'
import { XiangqiSideBadge } from './XiangqiSideBadge'
import {
  sideLabel,
  type XiangqiPendingUndoViewModel,
  type XiangqiResultViewModel,
} from './xiangqi-view-model'

export interface XiangqiStatusPanelProps {
  readonly currentPlayer: XiangqiSide | null
  readonly thinkingSide: XiangqiSide | null
  readonly inCheckSide: XiangqiSide | null
  readonly pendingUndo: XiangqiPendingUndoViewModel | null
  readonly result: XiangqiResultViewModel | null
  readonly moveCount: number
}

export function XiangqiStatusPanel({
  currentPlayer,
  thinkingSide,
  inCheckSide,
  pendingUndo,
  result,
  moveCount,
}: XiangqiStatusPanelProps) {
  const status = describeStatus(currentPlayer, thinkingSide, inCheckSide, pendingUndo)
  const indicatorSide = result !== null ? result.winner : status.indicatorSide

  return (
    <Card>
      <CardHeader>
        <CardTitle>{result === null ? '对局进行中' : '对局结束'}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {result === null ? (
          <div className="flex items-start gap-3">
            <SideIndicator side={indicatorSide} />
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
          <span>{result === null ? `轮到${sideLabel(currentPlayer)}` : ' '}</span>
        </div>
      </CardContent>
    </Card>
  )
}

interface StatusDescription {
  readonly title: string
  readonly detail: string
  readonly indicatorSide: XiangqiSide | null
}

function describeStatus(
  currentPlayer: XiangqiSide | null,
  thinkingSide: XiangqiSide | null,
  inCheckSide: XiangqiSide | null,
  pendingUndo: XiangqiPendingUndoViewModel | null,
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
      detail: '最短思考时间结束后自动走子',
      indicatorSide: thinkingSide,
    }
  }
  if (inCheckSide !== null && inCheckSide === currentPlayer) {
    return {
      title: `${sideLabel(currentPlayer)}被将军`,
      detail: '必须应将：移动将帅、吃掉进攻棋子或用棋子阻挡',
      indicatorSide: currentPlayer,
    }
  }
  return {
    title: `轮到${sideLabel(currentPlayer)}`,
    detail:
      currentPlayer === null
        ? '等待开局'
        : '点击己方棋子，再点击高亮的目标点走子',
    indicatorSide: currentPlayer,
  }
}

function SideIndicator({ side }: { readonly side: XiangqiSide | null }) {
  if (side === null) {
    return <span aria-hidden="true" className="size-6 shrink-0 rounded-full bg-muted" />
  }
  return <XiangqiSideBadge side={side} className="size-6" />
}