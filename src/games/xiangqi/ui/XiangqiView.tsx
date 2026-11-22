import { MessageBar } from '@/components/game/MessageBar/MessageBar'
import { XiangqiActionBar } from './XiangqiActionBar'
import { XiangqiBoard } from './XiangqiBoard'
import { XiangqiStatusPanel } from './XiangqiStatusPanel'
import { XiangqiUndoPrompt } from './XiangqiUndoPrompt'
import type { XiangqiViewProps } from './xiangqi-view-model'

export function XiangqiView(props: XiangqiViewProps) {
  const interactive =
    props.board.interactive && props.activeHumanSide !== null && props.pendingUndo === null

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-4">
        {props.message !== null ? (
          <MessageBar
            tone={props.message.type}
            text={props.message.text}
            onDismiss={props.onDismissMessage}
          />
        ) : null}
        <XiangqiBoard
          vm={props.board}
          currentPlayer={props.currentPlayer}
          interactive={interactive}
          onMove={props.onMove}
        />
        <p className="text-xs text-muted-foreground">
          点击己方棋子，再点击高亮目标点走子；红色虚线圈表示可以吃子。
          红方先行，将死或困毙对方即胜。悔棋只有刚行动过的一方可以发起。
        </p>
      </div>

      <aside className="flex flex-col gap-4">
        <XiangqiStatusPanel
          currentPlayer={props.currentPlayer}
          thinkingSide={props.thinkingSide}
          inCheckSide={props.board.inCheckSide}
          pendingUndo={props.pendingUndo}
          result={props.result}
          moveCount={props.moveCount}
        />
        {props.pendingUndo !== null && props.pendingUndo.awaitingHuman ? (
          <XiangqiUndoPrompt vm={props.pendingUndo} onRespond={props.onResolveUndo} />
        ) : null}
        <XiangqiActionBar
          canRequestUndo={props.canRequestUndo}
          undoRequester={props.undoRequester}
          result={props.result}
          onRequestUndo={props.onRequestUndo}
          onRestart={props.onRestart}
          onBackToConfig={props.onBackToConfig}
        />
      </aside>
    </div>
  )
}