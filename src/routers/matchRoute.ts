import type { RouteDefinition, RouteMatch } from './types'

export function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.replace(/\/+$/, '')
  }
  return pathname || '/'
}

function splitPath(pathname: string): readonly string[] {
  return pathname.split('/').filter((segment) => segment.length > 0)
}

/** 纯函数匹配：`/games/:gameId` 抽取参数，`*` 视为兜底、不在此匹配。 */
export function matchRoute(
  routes: readonly RouteDefinition[],
  pathname: string,
): RouteMatch | null {
  const segments = splitPath(pathname)

  for (const route of routes) {
    if (route.pattern === '*') continue

    const patternSegments = splitPath(route.pattern)
    if (patternSegments.length !== segments.length) continue

    const params: Record<string, string> = {}
    let matched = true

    for (let index = 0; index < patternSegments.length; index += 1) {
      const patternSegment = patternSegments[index]
      const segment = segments[index]

      if (patternSegment.startsWith(':')) {
        params[patternSegment.slice(1)] = decodeURIComponent(segment)
        continue
      }

      if (patternSegment !== segment) {
        matched = false
        break
      }
    }

    if (matched) {
      return { route, params, pathname: normalizePathname(pathname) }
    }
  }

  return null
}