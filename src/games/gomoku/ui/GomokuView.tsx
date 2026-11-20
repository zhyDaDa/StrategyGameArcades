import { Button } from '@/components/ui/button'
import { GomokuActionBar } from './GomokuActionBar'
import { GomokuBoard } from './GomokuBoard'
import { GomokuStatusPanel } from './GomokuStatusPanel'
import { GomokuUndoPrompt } from './GomokuUndoPrompt'
import type { GomokuViewMessage, GomokuViewProps } from './gomoku-view-model'

export function GomokuView(props: GomokuViewProps) {
  const interactive =
    props.board.interactive && props.activeHumanSide !== null && props.pendingUndo === null

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-4">
        {props.message !== null ? (
          <MessageBar message={props.message} onDismiss={props.onDismissMessage} />
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

function MessageBar({
  message,
  onDismiss,
}: {
  readonly message: GomokuViewMessage
  readonly onDismiss: () => void
}) {
  return (
    <div
      role={message.type === 'error' ? 'alert' : 'status'}
      className={[
        'flex items-start justify-between gap-3 rounded-xl border p-3 text-sm',
        message.type === 'error'
          ? 'border-destructive/40 bg-destructive/5 text-destructive'
          : 'border-border bg-muted/50 text-muted-foreground',
      ].join(' ')}
    >
      <p>{message.text}</p>
      <Button variant="ghost" size="xs" onClick={onDismiss}>
        关闭
      </Button>
    </div>
  )
}