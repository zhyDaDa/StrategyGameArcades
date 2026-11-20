import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PageTransitionOverlay, pageTransitionTokens } from '@/presentation/page-transition'
import { Link } from './Link'
import { RouterContext } from './RouterContext'
import { matchRoute, normalizePathname } from './matchRoute'
import { ROUTE_PATHS, type RouteId } from './paths'
import type {
  ActiveRoute,
  NavigationPhase,
  RouteDefinition,
  RouteLoadResult,
  RouteTarget,
  RouterContextValue,
} from './types'

export interface RouterProviderProps {
  readonly routes: readonly RouteDefinition[]
  readonly fallbackRouteId: RouteId
}

interface RouteLoadError {
  readonly pathname: string
  readonly message: string
}

function currentHref(): string {
  return window.location.pathname + window.location.search + window.location.hash
}

/**
 * 路由唯一入口。切换流程固定为：
 *   点击 → covering（旧页面退出）→ 提交 URL → loading（spinner 强制停留）→ revealing（新页面入场）→ idle
 * 页面加载在点击瞬间并行开始；但 loading 阶段至少停留 pageTransitionTokens.loadingMinDuration，
 * 所以页面再快，spinner 也一定会被完整看到。
 * 遮罩、计时、加载状态都由这里编排，页面本身只有「被渲染」和「发导航」两件事。
 */
export function RouterProvider({ routes, fallbackRouteId }: RouterProviderProps) {
  const fallbackRoute = useMemo(() => {
    const route = routes.find((item) => item.id === fallbackRouteId)
    if (route === undefined) {
      throw new Error(`RouterProvider：兜底路由 "${fallbackRouteId}" 没有在 routes 中注册`)
    }
    return route
  }, [routes, fallbackRouteId])

  const [phase, setPhase] = useState<NavigationPhase>('loading')
  const [active, setActive] = useState<ActiveRoute | null>(null)
  const [loadError, setLoadError] = useState<RouteLoadError | null>(null)

  const phaseRef = useRef<NavigationPhase>('loading')
  const activePathRef = useRef<string | null>(null)
  const pendingRef = useRef<RouteTarget | null>(null)
  const queuedPopRef = useRef<RouteTarget | null>(null)
  const runIdRef = useRef(0)
  const loadingStartedAtRef = useRef(0)
  const revealTimerRef = useRef<number | null>(null)

  const applyPhase = useCallback((next: NavigationPhase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const resolveTarget = useCallback(
    (href: string, applyUrl: boolean): RouteTarget => {
      const url = new URL(href, window.location.origin)
      const pathname = normalizePathname(url.pathname)
      const match = matchRoute(routes, pathname) ?? {
        route: fallbackRoute,
        params: {},
        pathname,
      }

      return {
        pathname,
        href: pathname + url.search + url.hash,
        match,
        applyUrl,
        loadResult: match.route.load().then(
          (page): RouteLoadResult => ({ ok: true, page }),
          (error): RouteLoadResult => ({ ok: false, error }),
        ),
      }
    },
    [routes, fallbackRoute],
  )

  /**
   * 页面就绪后不立即露出：从 loading 阶段开始计时，补足最短停留时间。
   * 页面加载更慢时直接进入 revealing，不再额外等待。
   */
  const revealWhenLoadingSettled = useCallback(() => {
    const remainingMs =
      pageTransitionTokens.loadingMinDuration * 1000 -
      (performance.now() - loadingStartedAtRef.current)

    if (remainingMs <= 0) {
      applyPhase('revealing')
      return
    }

    revealTimerRef.current = window.setTimeout(() => {
      revealTimerRef.current = null
      applyPhase('revealing')
    }, remainingMs)
  }, [applyPhase])

  const settleLoadedPage = useCallback(
    (target: RouteTarget, result: RouteLoadResult) => {
      if (result.ok) {
        activePathRef.current = target.pathname
        setActive({
          pathname: target.pathname,
          match: target.match,
          Page: result.page.Page,
        })
        setLoadError(null)
      } else {
        console.error(`[router] 页面加载失败：${target.pathname}`, result.error)
        setLoadError({
          pathname: target.pathname,
          message: result.error instanceof Error ? result.error.message : String(result.error),
        })
      }
      revealWhenLoadingSettled()
    },
    [revealWhenLoadingSettled],
  )

  const handleCoverComplete = useCallback(() => {
    const target = pendingRef.current
    if (target === null) return

    if (target.applyUrl && target.href !== currentHref()) {
      window.history.pushState(null, '', target.href)
    }

    window.scrollTo({ top: 0, left: 0 })
    loadingStartedAtRef.current = performance.now()
    applyPhase('loading')

    const runId = (runIdRef.current += 1)
    void target.loadResult.then((result) => {
      if (runIdRef.current !== runId) return
      settleLoadedPage(target, result)
    })
  }, [applyPhase, settleLoadedPage])

  const handleRevealComplete = useCallback(() => {
    pendingRef.current = null
    applyPhase('idle')

    const queued = queuedPopRef.current
    queuedPopRef.current = null
    if (queued === null || queued.pathname === activePathRef.current) return

    // popstate 排队期间 URL 可能已被后续 pushState 覆盖；此时需要重新写回。
    pendingRef.current = { ...queued, applyUrl: queued.href !== currentHref() }
    applyPhase('covering')
  }, [applyPhase])

  const navigate = useCallback(
    (to: string) => {
      if (!to.startsWith('/')) {
        throw new Error(`navigate() 只接受站内绝对路径：${to}`)
      }
      if (phaseRef.current !== 'idle') return

      const target = resolveTarget(to, true)
      if (target.pathname === activePathRef.current) return

      pendingRef.current = target
      applyPhase('covering')
    },
    [resolveTarget, applyPhase],
  )

  // 首次进入：初始即为 loading，同样遵守最短停留，就绪后播放入场（露白）动画。
  useEffect(() => {
    loadingStartedAtRef.current = performance.now()
    const target = resolveTarget(window.location.href, false)
    pendingRef.current = target

    const runId = (runIdRef.current += 1)
    void target.loadResult.then((result) => {
      if (runIdRef.current !== runId) return
      settleLoadedPage(target, result)
    })
  }, [resolveTarget, settleLoadedPage])

  useEffect(() => {
    return () => {
      if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current)
    }
  }, [])

  // 浏览器前进 / 后退同样走完整过渡；切换中触发的 popstate 排队到本次结束。
  useEffect(() => {
    const handlePopState = () => {
      const target = resolveTarget(window.location.href, false)

      if (phaseRef.current === 'idle') {
        if (target.pathname === activePathRef.current) {
          setLoadError(null)
          return
        }
        pendingRef.current = target
        applyPhase('covering')
        return
      }

      queuedPopRef.current = target
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [resolveTarget, applyPhase])

  const routerValue = useMemo<RouterContextValue>(
    () => ({
      phase,
      pathname: active?.pathname ?? null,
      match: active?.match ?? null,
      navigate,
    }),
    [phase, active, navigate],
  )

  const ActivePage = active?.Page ?? null

  return (
    <RouterContext.Provider value={routerValue}>
      {loadError !== null ? (
        <RouteLoadFailure pathname={loadError.pathname} message={loadError.message} />
      ) : ActivePage !== null && active !== null ? (
        <ActivePage key={active.pathname} />
      ) : null}

      {phase !== 'idle' ? (
        <PageTransitionOverlay
          phase={phase}
          onCoverComplete={handleCoverComplete}
          onRevealComplete={handleRevealComplete}
        />
      ) : null}
    </RouterContext.Provider>
  )
}

function RouteLoadFailure({ pathname, message }: { pathname: string; message: string }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-4 px-6">
      <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">ROUTE ERROR</p>
      <h1 className="text-2xl font-semibold tracking-tight">页面加载失败</h1>
      <p className="text-sm text-muted-foreground">{pathname}</p>
      <p className="text-xs text-destructive">{message}</p>
      <Link to={ROUTE_PATHS.home} className="w-fit text-sm underline underline-offset-4">
        返回首页
      </Link>
    </main>
  )
}