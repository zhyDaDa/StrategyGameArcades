import { MessageBar } from '@/components/game/MessageBar/MessageBar'
import { ChessActionBar } from './ChessActionBar'
import { ChessBoard } from './ChessBoard'
import { ChessStatusPanel } from './ChessStatusPanel'
import { ChessUndoPrompt } from './ChessUndoPrompt'
import type { ChessViewProps } from './chess-view-model'

export function ChessView(props: ChessViewProps) {
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
            onRetry={props.message.type === "error" ? props.onRetry : undefined}
          />
        ) : null}
        <ChessBoard
          vm={props.board}
          currentPlayer={props.currentPlayer}
          interactive={interactive}
          onMove={props.onMove}
        />
        <p className="text-xs text-muted-foreground">
          点击己方棋子，再点击高亮目标格走子；兵的最后一格会弹出升变选择。
          白方先行，将死对方即胜。悔棋只有刚行动过的一方可以发起。
        </p>
      </div>

      <aside className="flex flex-col gap-4">
        <ChessStatusPanel
          currentPlayer={props.currentPlayer}
          thinkingSide={props.thinkingSide}
          inCheckSide={props.board.inCheckSide}
          pendingUndo={props.pendingUndo}
          result={props.result}
          moveCount={props.moveCount}
        />
        {props.pendingUndo !== null && props.pendingUndo.awaitingHuman ? (
          <ChessUndoPrompt vm={props.pendingUndo} onRespond={props.onResolveUndo} />
        ) : null}
        <ChessActionBar
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