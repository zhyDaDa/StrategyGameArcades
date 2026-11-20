import type { ReactNode } from 'react'

export interface NavBarProps {
  readonly leading?: ReactNode
  readonly title: ReactNode
  readonly actions?: ReactNode
}

/** 全站顶部导航：固定在视口顶部，内容区在它下方独立滚动。 */
export function NavBar({ leading, title, actions }: NavBarProps) {
  return (
    <header className="shrink-0 border-b border-border/70 bg-background">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-1">
          {leading}
          <div className="flex min-w-0 items-center text-sm font-semibold tracking-tight">
            {title}
          </div>
        </div>
        {actions === undefined ? null : (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        )}
      </div>
    </header>
  )
}