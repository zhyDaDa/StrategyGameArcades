import { Button } from '@/components/ui/button'
import { sideLabel, type GoPendingUndoViewModel } from './go-view-model'

export interface GoUndoPromptProps {
  readonly vm: GoPendingUndoViewModel
  readonly onRespond: (accept: boolean) => void
}

/** 本地双人时的悔棋协商界面：只有应答方是真人时才出现。 */
export function GoUndoPrompt({ vm, onRespond }: GoUndoPromptProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">
          UNDO / 悔棋申请
        </p>
        <p className="text-sm font-medium">
          {sideLabel(vm.requester)} 想撤回自己上一手
        </p>
        <p className="text-xs text-muted-foreground">
          {sideLabel(vm.responder)} 是否同意？同意后轮到 {sideLabel(vm.requester)} 重新落子。
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