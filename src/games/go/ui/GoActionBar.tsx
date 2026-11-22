import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { GoSide } from '../domain/types'
import { sideLabel, type GoResultViewModel } from './go-view-model'

export interface GoActionBarProps {
  readonly canRequestUndo: boolean
  readonly undoRequester: GoSide | null
  readonly canPass: boolean
  readonly canResign: boolean
  readonly result: GoResultViewModel | null
  readonly onRequestUndo: () => void
  readonly onPass: () => void
  readonly onResign: () => void
  readonly onRestart: () => void
  readonly onBackToConfig: () => void
}

type ConfirmAction = 'resign' | 'restart'

export function GoActionBar({
  canRequestUndo,
  undoRequester,
  canPass,
  canResign,
  result,
  onRequestUndo,
  onPass,
  onResign,
  onRestart,
  onBackToConfig,
}: GoActionBarProps) {
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)

  if (confirm !== null) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border p-3">
        <p className="text-sm">
          {confirm === 'resign'
            ? '确认认输？对手将立即获胜。'
            : '确认重开？当前局面会被清空。'}
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
            title={canRequestUndo ? '撤回自己刚下的一手' : '只有刚行动过的玩家可以申请悔棋'}
          >
            {undoRequester === null ? '申请悔棋' : `悔棋（${sideLabel(undoRequester)}）`}
          </Button>
          <Button
            variant="outline"
            disabled={!canPass}
            onClick={onPass}
            title={canPass ? '本手不下子；双方连续停一手将结束对局' : '等待轮到本机玩家'}
          >
            停一手
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