import { MotionConfig } from 'motion/react'
import { MessageBar } from '@/components/game/MessageBar/MessageBar'
import { DotsActionBar } from './DotsActionBar'
import { DotsAndBoxesBoard } from './DotsAndBoxesBoard'
import { DotsPlayersPanel } from './DotsPlayersPanel'
import { DotsUndoPrompt } from './DotsUndoPrompt'
import type { DotsAndBoxesViewProps } from './dots-and-boxes-view-model'

export function DotsAndBoxesView(props: DotsAndBoxesViewProps) {
  return (
    /**
     * 本游戏的落线与回合反馈是核心玩法信息：系统开启「减少动画效果」时，
     * reduced-motion 会把这些 top / scale 动画直接跳到终值，等于把反馈藏掉。
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

        <DotsAndBoxesBoard
          vm={props.board}
          interactive={props.interactive}
          freshEdge={props.freshEdge}
          drawVersion={props.drawVersion}
          freshClaims={props.freshClaims}
          onDrawEdge={props.onDrawEdge}
        />

        <p className="text-xs text-muted-foreground">
          把鼠标移到相邻两点之间可预览连线；围成方格得 1 分并继续行动。悔棋只有刚行动过的一方可以发起。
        </p>
      </div>

      <aside className="flex flex-col gap-4">
        <DotsPlayersPanel players={props.players} />

        {props.result !== null ? (
          <div className="flex flex-col gap-1 rounded-xl border border-primary/40 bg-primary/5 p-4">
            <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">
              RESULT / 结算
            </p>
            <p className="text-2xl font-semibold tracking-tight">{props.result.title}</p>
            <p className="text-sm text-muted-foreground">{props.result.detail}</p>
          </div>
        ) : null}

        {props.pendingUndo !== null && props.pendingUndo.awaitingHuman ? (
          <DotsUndoPrompt vm={props.pendingUndo} onRespond={props.onResolveUndo} />
        ) : null}

        <DotsActionBar
          canRequestUndo={props.canRequestUndo}
          undoRequesterName={
            props.undoRequester === null
              ? null
              : props.players.find((player) => player.seat === props.undoRequester)?.name ?? null
          }
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