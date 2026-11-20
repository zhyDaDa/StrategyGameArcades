/** 站内路径的唯一来源：链接、跳转与路由注册都从这里取值。 */
export const ROUTE_IDS = ['home', 'game', 'notFound'] as const

export type RouteId = (typeof ROUTE_IDS)[number]

/**
 * `pattern` 支持静态段与 `:param` 动态段，`*` 表示兜底路由。
 * 具体页面由 `app/routes.tsx` 注册，router 本身不认识任何游戏。
 */
export const ROUTE_PATHS: Record<RouteId, string> = {
  home: '/',
  game: '/games/:gameId',
  notFound: '*',
}

/** 由游戏 ID 生成详情页路径，避免各处手写 `/games/xxx`。 */
export function gamePath(gameId: string): string {
  return `/games/${gameId}`
}