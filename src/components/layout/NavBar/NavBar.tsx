import type { ReactNode } from 'react'

export interface NavBarProps {
  readonly title: ReactNode
  readonly actions?: ReactNode
}

/** 全站顶部导航：左侧页面标识，右侧操作区。高度固定，滚动时吸顶。 */
export function NavBar({ title, actions }: NavBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center text-sm font-semibold tracking-tight">
          {title}
        </div>
        {actions === undefined ? null : (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        )}
      </div>
    </header>
  )
}