import { animate } from 'motion/react'
import { useLayoutEffect, useRef } from 'react'
import { motionTokens } from '@/presentation/motion/tokens'
import { pageTransitionTokens } from './tokens'
import type { PageTransitionPhase } from './types'

interface LoadingIndicatorProps {
  readonly phase: PageTransitionPhase
  readonly reducedMotion: boolean
}

/**
 * 跨阶段常驻的加载指示器，独立于背景遮罩层。
 * 它不会随覆盖/露出切换而重新挂载：在退场波浪前 1/3 处提前淡入，
 * 遮罩铺满前已完整可见；在揭示波浪前 1/3 处开始淡出，与背景无缝衔接。
 */
export function LoadingIndicator({ phase, reducedMotion }: LoadingIndicatorProps) {
  const indicatorRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = indicatorRef.current
    if (element === null) return

    // 波浪总时长的 1/3：覆盖与露出的早段。
    const waveThirdSeconds =
      (pageTransitionTokens.maxStagger + pageTransitionTokens.waveDuration) / 3
    const fadeDelay = reducedMotion ? 0 : waveThirdSeconds

    if (phase === 'covering') {
      const animation = animate(
        element,
        { opacity: [0, 1] },
        { duration: motionTokens.duration.normal, delay: fadeDelay, ease: motionTokens.ease.out },
      )
      return () => animation.stop()
    }

    if (phase === 'loading') {
      const animation = animate(
        element,
        { opacity: 1 },
        { duration: motionTokens.duration.quick },
      )
      return () => animation.stop()
    }

    const animation = animate(
      element,
      { opacity: 0 },
      { duration: motionTokens.duration.normal, delay: fadeDelay, ease: motionTokens.ease.out },
    )
    return () => animation.stop()
  }, [phase, reducedMotion])

  return (
    <div
      ref={indicatorRef}
      role="status"
      aria-label="页面加载中"
      style={{ opacity: 0 }}
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
    >
      {reducedMotion ? (
        <span className="text-sm text-muted-foreground">加载中…</span>
      ) : (
        <span className="size-8 animate-spin rounded-full border-[3px] border-foreground/15 border-t-foreground" />
      )}
    </div>
  )
}