import { Button } from '@/components/ui/button'

export interface MessageBarProps {
  readonly tone: 'info' | 'error'
  readonly text: string
  readonly onDismiss: () => void
  /** 错误来自可重试的 AI 决策时提供；重试会重新调用当前席位的控制器。 */
  readonly onRetry?: () => void
}

/** 对局页通用的提示条：错误用警示色，普通信息用中性色，均可手动关闭。 */
export function MessageBar({ tone, text, onDismiss, onRetry }: MessageBarProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={[
        'flex items-start justify-between gap-3 rounded-xl border p-3 text-sm',
        tone === 'error'
          ? 'border-destructive/40 bg-destructive/5 text-destructive'
          : 'border-border bg-muted/50 text-muted-foreground',
      ].join(' ')}
    >
      <p>{text}</p>
      <div className="flex shrink-0 gap-1">
        {onRetry !== undefined ? (
          <Button variant="ghost" size="xs" onClick={onRetry}>
            重试
          </Button>
        ) : null}
        <Button variant="ghost" size="xs" onClick={onDismiss}>
          关闭
        </Button>
      </div>
    </div>
  )
}