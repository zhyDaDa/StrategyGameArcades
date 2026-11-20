import { ROUTE_PATHS } from '@/routers/paths'
import type { RouteDefinition } from '@/routers/types'

/**
 * 页面注册表：路由模式 → 懒加载页面。
 * 新增页面只在这里登记；RouterProvider 只消费这张表，不感知任何具体页面。
 */
export const ROUTES: readonly RouteDefinition[] = [
  {
    id: 'home',
    pattern: ROUTE_PATHS.home,
    load: async () => {
      const { HomePage } = await import('./pages/HomePage')
      return { Page: HomePage }
    },
  },
  {
    id: 'gameConfig',
    pattern: ROUTE_PATHS.gameConfig,
    load: async () => {
      const { GameConfigPage } = await import('./pages/GameConfigPage')
      return { Page: GameConfigPage }
    },
  },
  {
    id: 'game',
    pattern: ROUTE_PATHS.game,
    load: async () => {
      const { GamePage } = await import('./pages/GamePage')
      return { Page: GamePage }
    },
  },
  {
    id: 'settings',
    pattern: ROUTE_PATHS.settings,
    load: async () => {
      const { SettingsPage } = await import('./pages/SettingsPage')
      return { Page: SettingsPage }
    },
  },
  {
    id: 'notFound',
    pattern: ROUTE_PATHS.notFound,
    load: async () => {
      const { NotFoundPage } = await import('./pages/NotFoundPage')
      return { Page: NotFoundPage }
    },
  },
]