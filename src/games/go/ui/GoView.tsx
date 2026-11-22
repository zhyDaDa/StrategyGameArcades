import { MotionConfig } from 'motion/react'
import { MessageBar } from '@/components/game/MessageBar/MessageBar'
import { GoActionBar } from './GoActionBar'
import { GoBoard } from './GoBoard'
import { GoStatusPanel } from './GoStatusPanel'
import { GoUndoPrompt } from './GoUndoPrompt'
import type { GoViewProps } from './go-view-model'

export function GoView(props: GoViewProps) {
  const interactive =
    props.board.interactive && props.activeHumanSide !== null && props.pendingUndo === null

  return (
    /**
     * 落子弹入与被提子离场是围棋的核心玩法反馈。
     * reduced-motion 会把 scale 直接跳到终值，等于把「这颗子刚刚发生了什么」藏掉，
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
          <GoBoard
            vm={props.board}
            currentPlayer={props.currentPlayer}
            interactive={interactive}
            onPlace={props.onPlace}
          />
          <p className="text-xs text-muted-foreground">
            点击交叉点落子；无气的整块棋子会被提掉，虚线框表示当前不能回提的劫点。双方连续停一手后按中国规则数子。悔棋只有刚行动过的一方可以发起。
          </p>
        </div>

        <aside className="flex flex-col gap-4">
          <GoStatusPanel
            currentPlayer={props.currentPlayer}
            thinkingSide={props.thinkingSide}
            passedSide={props.passedSide}
            captures={props.captures}
            pendingUndo={props.pendingUndo}
            result={props.result}
            moveCount={props.moveCount}
          />
          {props.pendingUndo !== null && props.pendingUndo.awaitingHuman ? (
            <GoUndoPrompt vm={props.pendingUndo} onRespond={props.onResolveUndo} />
          ) : null}
          <GoActionBar
            canRequestUndo={props.canRequestUndo}
            undoRequester={props.undoRequester}
            canPass={props.activeHumanSide !== null && props.result === null && props.pendingUndo === null}
            canResign={props.activeHumanSide !== null && props.result === null && props.pendingUndo === null}
            result={props.result}
            onRequestUndo={props.onRequestUndo}
            onPass={props.onPass}
            onResign={props.onResign}
            onRestart={props.onRestart}
            onBackToConfig={props.onBackToConfig}
          />
        </aside>
      </div>
    </MotionConfig>
  )
}