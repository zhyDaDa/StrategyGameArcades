import { MotionConfig } from 'motion/react'
import { MessageBar } from '@/components/game/MessageBar/MessageBar'
import { ReversiActionBar } from './ReversiActionBar'
import { ReversiBoard } from './ReversiBoard'
import { ReversiStatusPanel } from './ReversiStatusPanel'
import { ReversiUndoPrompt } from './ReversiUndoPrompt'
import type { ReversiViewProps } from './reversi-view-model'

export function ReversiView(props: ReversiViewProps) {
  const interactive =
    props.board.interactive && props.activeHumanSide !== null && props.pendingUndo === null

  return (
    /**
     * 翻面动画就是黑白棋的核心玩法反馈（「夹住后哪些子被翻」）。
     * reduced-motion 会把 rotateY 直接跳到终值，等于把翻面过程藏掉，
     * 因此只在这个游戏子树内忽略系统偏好，站内其余页面仍遵循全局设置。
     */
    <MotionConfig reducedMotion="never">
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
          <ReversiBoard
            vm={props.board}
            currentPlayer={props.currentPlayer}
            interactive={interactive}
            onPlace={props.onPlace}
          />
          <p className="text-xs text-muted-foreground">
            点击带提示的空位落子，落子会夹住并翻转对方的棋子。悔棋只有刚行动过的一方可以发起。
          </p>
        </div>

        <aside className="flex flex-col gap-4">
          <ReversiStatusPanel
            currentPlayer={props.currentPlayer}
            thinkingSide={props.thinkingSide}
            passedSide={props.passedSide}
            counts={props.counts}
            pendingUndo={props.pendingUndo}
            result={props.result}
            moveCount={props.moveCount}
          />
          {props.pendingUndo !== null && props.pendingUndo.awaitingHuman ? (
            <ReversiUndoPrompt vm={props.pendingUndo} onRespond={props.onResolveUndo} />
          ) : null}
          <ReversiActionBar
            canRequestUndo={props.canRequestUndo}
            undoRequester={props.undoRequester}
            result={props.result}
            onRequestUndo={props.onRequestUndo}
            onRestart={props.onRestart}
            onBackToConfig={props.onBackToConfig}
          />
        </aside>
      </div>
    </MotionConfig>
  )
}