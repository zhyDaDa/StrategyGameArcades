import { MotionConfig } from 'motion/react'
import { MessageBar } from '@/components/game/MessageBar/MessageBar'
import { NestedTicTacToeActionBar } from './NestedTicTacToeActionBar'
import { NestedTicTacToeBoard } from './NestedTicTacToeBoard'
import { NestedTicTacToeStatusPanel } from './NestedTicTacToeStatusPanel'
import { NestedTicTacToeUndoPrompt } from './NestedTicTacToeUndoPrompt'
import type { NestedTicTacToeViewProps } from './nested-tic-tac-toe-view-model'

export function NestedTicTacToeView(props: NestedTicTacToeViewProps) {
  const interactive =
    props.board.interactive && props.activeHumanSide !== null && props.pendingUndo === null

  return (
    /**
     * 描边框的游走与占领小棋盘的刷色是本游戏的核心玩法反馈。
     * reduced-motion 会把 layout / scale 动画直接跳到终值，等于把「现在能下哪里」藏掉，
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
            />
          ) : null}

          <NestedTicTacToeBoard
            vm={props.board}
            interactive={interactive}
            freshCell={props.freshCell}
            freshMicroBoards={props.freshMicroBoards}
            onPlace={props.onPlace}
          />

          <p className="text-xs text-muted-foreground">
            描边框表示本手可落区域；已占领或封盘的小棋盘不能再落子。落点在宫内的位置决定对手下一步要下的小棋盘；若目标宫已占领或封盘，描边框会展开整盘，可任意落子。悔棋只有刚行动过的一方可以发起。
          </p>
        </div>

        <aside className="flex flex-col gap-4">
          <NestedTicTacToeStatusPanel
            currentSide={props.currentSide}
            thinkingSide={props.thinkingSide}
            pendingUndo={props.pendingUndo}
            result={props.result}
            moveCount={props.moveCount}
            capturedCounts={props.capturedCounts}
          />
          {props.pendingUndo !== null && props.pendingUndo.awaitingHuman ? (
            <NestedTicTacToeUndoPrompt
              vm={props.pendingUndo}
              onRespond={props.onResolveUndo}
            />
          ) : null}
          <NestedTicTacToeActionBar
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