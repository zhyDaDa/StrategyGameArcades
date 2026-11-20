import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { DotsResultViewModel } from './dots-and-boxes-view-model'

export interface DotsActionBarProps {
  readonly canRequestUndo: boolean
  readonly undoRequesterName: string | null
  readonly result: DotsResultViewModel | null
  readonly onRequestUndo: () => void
  readonly onRestart: () => void
  readonly onBackToConfig: () => void
}

export function DotsActionBar({
  canRequestUndo,
  undoRequesterName,
  result,
  onRequestUndo,
  onRestart,
  onBackToConfig,
}: DotsActionBarProps) {
  const [confirmRestart, setConfirmRestart] = useState(false)

  if (confirmRestart) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border p-3">
        <p className="text-sm">确认重开？当前局面与所有得分会被清空。</p>
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
            title={
              canRequestUndo
                ? '撤回自己刚画的一根线'
                : '只有刚行动过、且现在不是自己回合的玩家可以申请悔棋'
            }
          >
            {undoRequesterName === null ? '申请悔棋' : `悔棋（${undoRequesterName}）`}
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