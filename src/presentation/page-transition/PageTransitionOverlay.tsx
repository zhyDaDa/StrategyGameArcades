import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { DotCurtain } from './DotCurtain'
import { buildDotGrid, gridAnimationSeconds } from './layout'
import { pageTransitionTokens } from './tokens'
import type { PageTransitionOverlayProps } from './types'

function readViewport() {
  return { width: window.innerWidth, height: window.innerHeight }
}

/**
 * 页面切换遮罩。只负责三件事：演出的像素、阶段时长、在动画结束时通知路由层。
 * 不读路由、不写路由，接入方通过 phase + 两个回调驱动它。
 */
export function PageTransitionOverlay({
  phase,
  onCoverComplete,
  onRevealComplete,
}: PageTransitionOverlayProps) {
  const prefersReducedMotion = useReducedMotion() === true
  const [viewport] = useState(readViewport)
  const grid = buildDotGrid(viewport.width, viewport.height)
  const phaseSeconds = prefersReducedMotion ? 0 : gridAnimationSeconds(grid)

  useEffect(() => {
    if (phase === 'covering') {
      const timer = window.setTimeout(onCoverComplete, phaseSeconds * 1000)
      return () => window.clearTimeout(timer)
    }

    if (phase === 'revealing') {
      const timer = window.setTimeout(onRevealComplete, phaseSeconds * 1000)
      return () => window.clearTimeout(timer)
    }

    return undefined
  }, [phase, phaseSeconds, onCoverComplete, onRevealComplete])

  if (phase === 'loading') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background"
        role="status"
        aria-label="页面加载中"
      >
        {prefersReducedMotion ? (
          <span className="text-sm text-muted-foreground">加载中…</span>
        ) : (
          <motion.span
            className="size-8 animate-spin rounded-full border-[3px] border-foreground/15 border-t-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              delay: pageTransitionTokens.spinnerDelay,
              duration: pageTransitionTokens.spinnerFadeDuration,
            }}
          />
        )}
      </div>
    )
  }

  if (prefersReducedMotion) {
    return <div aria-hidden="true" className="fixed inset-0 z-50 bg-background" />
  }

  return (
    <DotCurtain
      mode={phase === 'covering' ? 'cover' : 'reveal'}
      width={viewport.width}
      height={viewport.height}
    />
  )
}