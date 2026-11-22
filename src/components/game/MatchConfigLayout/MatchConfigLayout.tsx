import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export interface MatchConfigLayoutProps {
  readonly summary: ReactNode
  readonly onStart: () => void
  readonly children: ReactNode
  readonly startLabel?: string
  readonly footer?: ReactNode
}

/** 配置页通用骨架：左侧配置，右侧本局摘要与开始按钮。 */
export function MatchConfigLayout({
  summary,
  onStart,
  children,
  startLabel = '开始对局',
  footer,
}: MatchConfigLayoutProps) {
  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex flex-col gap-8">{children}</div>

      <aside className="flex h-fit flex-col gap-4 rounded-xl border p-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">
            MATCH / 本局
          </p>
          {summary}
        </div>
        <Button size="lg" onClick={onStart}>
          {startLabel}
        </Button>
        {footer ?? (
          <p className="text-xs text-muted-foreground">
            开始后会写入本局初始快照；刷新页面可继续当前局面。
          </p>
        )}
      </aside>
    </section>
  )
}