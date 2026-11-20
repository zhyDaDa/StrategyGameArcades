import { House } from 'lucide-react'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { NavBar } from '@/components/layout/NavBar/NavBar'
import { ThemeToggle } from '@/components/layout/ThemeToggle/ThemeToggle'
import { Button } from '@/components/ui/button'
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
    case 'gameConfig': {
      const game = GAMES.find((item) => item.id === match.params.gameId)
      return game === undefined ? '对局配置' : `${game.name} · 配置`
    }
    case 'settings':
      return '设置'
    case 'notFound':
      return '页面不存在'
  }
}

export function AppShell({ match, children }: AppShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0 })
  }, [match.pathname])

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <NavBar
        leading={
          match.route.id === 'home' ? null : (
            <Button variant="ghost" size="icon" asChild>
              <Link to={ROUTE_PATHS.home} aria-label="返回首页" title="返回首页">
                <House />
              </Link>
            </Button>
          )
        }
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
      <div
        ref={scrollRef}
        className="scroll-area flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
      >
        {children}
      </div>
    </div>
  )
}