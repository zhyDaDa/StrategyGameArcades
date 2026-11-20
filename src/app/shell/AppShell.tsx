import type { ReactNode } from 'react'
import { NavBar } from '@/components/layout/NavBar/NavBar'
import { ThemeToggle } from '@/components/layout/ThemeToggle/ThemeToggle'
import { GAMES } from '@/games/registry'
import { Link, ROUTE_PATHS, type RouteMatch } from '@/routers'
import { NavMenu } from './NavMenu'

export interface AppShellProps {
  readonly match: RouteMatch
  readonly children: ReactNode
}

/** 路由 → 导航栏标题。游戏名来自注册表，其余由路由 id 决定。 */
function resolveTitle(match: RouteMatch): string {
  switch (match.route.id) {
    case 'home':
      return '桌游实验室'
    case 'game': {
      const game = GAMES.find((item) => item.id === match.params.gameId)
      return game?.name ?? '未知游戏'
    }
    case 'settings':
      return '设置'
    case 'notFound':
      return '页面不存在'
  }
}

export function AppShell({ match, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <NavBar
        title={
          <Link
            to={ROUTE_PATHS.home}
            className="truncate rounded-sm outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            {resolveTitle(match)}
          </Link>
        }
        actions={
          <>
            <NavMenu />
            <ThemeToggle />
          </>
        }
      />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  )
}