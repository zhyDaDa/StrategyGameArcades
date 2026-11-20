import { MessageBar } from '@/components/game/MessageBar/MessageBar'
import { GomokuActionBar } from './GomokuActionBar'
import { GomokuBoard } from './GomokuBoard'
import { GomokuStatusPanel } from './GomokuStatusPanel'
import { GomokuUndoPrompt } from './GomokuUndoPrompt'
import type { GomokuViewProps } from './gomoku-view-model'

export function GomokuView(props: GomokuViewProps) {
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
        <GomokuBoard
          vm={props.board}
          currentPlayer={props.currentPlayer}
          interactive={interactive}
          onPlace={props.onPlace}
        />
        <p className="text-xs text-muted-foreground">
          点击空位落子；悔棋只有刚行动过的一方可以发起。
        </p>
      </div>

      <aside className="flex flex-col gap-4">
        <GomokuStatusPanel
          currentPlayer={props.currentPlayer}
          thinkingSide={props.thinkingSide}
          pendingUndo={props.pendingUndo}
          result={props.result}
          moveCount={props.moveCount}
        />
        {props.pendingUndo !== null && props.pendingUndo.awaitingHuman ? (
          <GomokuUndoPrompt vm={props.pendingUndo} onRespond={props.onResolveUndo} />
        ) : null}
        <GomokuActionBar
          canRequestUndo={props.canRequestUndo}
          undoRequester={props.undoRequester}
          canResign={props.activeHumanSide !== null && props.result === null && props.pendingUndo === null}
          result={props.result}
          onRequestUndo={props.onRequestUndo}
          onResign={props.onResign}
          onRestart={props.onRestart}
          onBackToConfig={props.onBackToConfig}
        />
      </aside>
    </div>
  )
}

