import type { ComponentType, ReactNode } from 'react'
import type { PageTransitionPhase } from '@/presentation/page-transition'
import type { RouteId } from './paths'

export interface LoadedRoutePage {
  readonly Page: ComponentType
}

export type RouteLoadResult =
  | { readonly ok: true; readonly page: LoadedRoutePage }
  | { readonly ok: false; readonly error: unknown }

export interface RouteDefinition {
  readonly id: RouteId
  readonly pattern: string
  readonly load: () => Promise<LoadedRoutePage>
}

export interface RouteMatch {
  readonly route: RouteDefinition
  readonly params: Readonly<Record<string, string>>
  readonly pathname: string
}

/** idle 表示没有切换；其余三个阶段与遮罩动画一一对应。 */
export type NavigationPhase = 'idle' | PageTransitionPhase

export interface RouteTarget {
  readonly pathname: string
  readonly href: string
  readonly match: RouteMatch
  /** popstate 时 URL 已由浏览器更新，提交路由时不能再 pushState。 */
  readonly applyUrl: boolean
  /** 点击链接时立即开始加载；结果无论成败都 resolve，避免未处理 rejection。 */
  readonly loadResult: Promise<RouteLoadResult>
}

/**
 * 页面外壳由 app 层注入：router 只提供当前页面与路由匹配，
 * 不感知导航栏、标题或任何具体游戏。
 */
export type RouteLayoutRenderer = (page: ReactNode, match: RouteMatch) => ReactNode

export interface ActiveRoute {
  readonly pathname: string
  readonly match: RouteMatch
  readonly Page: ComponentType
}

export interface RouterContextValue {
  readonly phase: NavigationPhase
  readonly pathname: string | null
  readonly match: RouteMatch | null
  readonly navigate: (to: string) => void
}