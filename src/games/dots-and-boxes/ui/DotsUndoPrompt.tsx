import { Button } from '@/components/ui/button'
import type { DotsPendingUndoViewModel } from './dots-and-boxes-view-model'

export interface DotsUndoPromptProps {
  readonly vm: DotsPendingUndoViewModel
  readonly onRespond: (accept: boolean) => void
}

/** 本地多人时的悔棋协商界面：只有应答方是真人时才出现。 */
export function DotsUndoPrompt({ vm, onRespond }: DotsUndoPromptProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">
          UNDO / 悔棋申请
        </p>
        <p className="text-sm font-medium">{vm.requesterName} 想撤回自己刚画的线</p>
        <p className="text-xs text-muted-foreground">
          {vm.responderName} 是否同意？同意后由 {vm.requesterName} 重新连线。
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => onRespond(false)}>
          拒绝
        </Button>
        <Button onClick={() => onRespond(true)}>同意</Button>
      </div>
    </div>
  )
}