import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { XiangqiSide } from '../domain/types'
import { sideLabel, type XiangqiResultViewModel } from './xiangqi-view-model'

export interface XiangqiActionBarProps {
  readonly canRequestUndo: boolean
  readonly undoRequester: XiangqiSide | null
  readonly result: XiangqiResultViewModel | null
  readonly onRequestUndo: () => void
  readonly onRestart: () => void
  readonly onBackToConfig: () => void
}

export function XiangqiActionBar({
  canRequestUndo,
  undoRequester,
  result,
  onRequestUndo,
  onRestart,
  onBackToConfig,
}: XiangqiActionBarProps) {
  const [confirmRestart, setConfirmRestart] = useState(false)

  if (confirmRestart) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border p-3">
        <p className="text-sm">确认重开？当前局面会被清空。</p>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setConfirmRestart(false)
              onRestart()
            }}
          >
            确认
          </Button>
          <Button variant="outline" onClick={() => setConfirmRestart(false)}>
            取消
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {result === null ? (
        <>
          <Button
            variant="outline"
            disabled={!canRequestUndo}
            onClick={onRequestUndo}
            title={canRequestUndo ? '撤回自己刚走的一步' : '只有刚行动过的玩家可以申请悔棋'}
          >
            {undoRequester === null ? '申请悔棋' : `悔棋（${sideLabel(undoRequester)}）`}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmRestart(true)}>
            重开本局
          </Button>
        </>
      ) : (
        <Button onClick={onRestart}>再来一局</Button>
      )}
      <Button variant="ghost" onClick={onBackToConfig}>
        返回配置
      </Button>
    </div>
  )
}