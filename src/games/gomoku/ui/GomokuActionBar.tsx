import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { GomokuSide } from '../domain/types'
import { sideLabel, type GomokuResultViewModel } from './gomoku-view-model'

export interface GomokuActionBarProps {
  readonly canRequestUndo: boolean
  readonly undoRequester: GomokuSide | null
  readonly canResign: boolean
  readonly result: GomokuResultViewModel | null
  readonly onRequestUndo: () => void
  readonly onResign: () => void
  readonly onRestart: () => void
  readonly onBackToConfig: () => void
}

type ConfirmAction = 'resign' | 'restart'

export function GomokuActionBar({
  canRequestUndo,
  undoRequester,
  canResign,
  result,
  onRequestUndo,
  onResign,
  onRestart,
  onBackToConfig,
}: GomokuActionBarProps) {
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)

  if (confirm !== null) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border p-3">
        <p className="text-sm">
          {confirm === 'resign' ? '确认认输？对手将立即获胜。' : '确认重开？当前局面会被清空。'}
        </p>
        <div className="flex gap-2">
          <Button
            variant={confirm === 'resign' ? 'destructive' : 'default'}
            onClick={() => {
              const action = confirm
              setConfirm(null)
              if (action === 'resign') {
                onResign()
              } else {
                onRestart()
              }
            }}
          >
            确认
          </Button>
          <Button variant="outline" onClick={() => setConfirm(null)}>
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
            title={canRequestUndo ? '撤回自己刚下的一步' : '只有刚行动过的玩家可以申请悔棋'}
          >
            {undoRequester === null ? '申请悔棋' : `悔棋（${sideLabel(undoRequester)}）`}
          </Button>
          <Button variant="destructive" disabled={!canResign} onClick={() => setConfirm('resign')}>
            认输
          </Button>
          <Button variant="ghost" onClick={() => setConfirm('restart')}>
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