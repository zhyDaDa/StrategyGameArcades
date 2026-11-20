import { animate } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'
import { motionTokens } from '@/presentation/motion/tokens'
import { buildBubbleMatrix } from './layout'
import { pageTransitionDebug, pageTransitionTokens } from './tokens'

export type BubbleMatrixMode = 'cover' | 'reveal'

interface BubbleMatrixProps {
  readonly mode: BubbleMatrixMode
  readonly width: number
  readonly height: number
  /** 全部气泡动画真正结束后触发，而不是靠计时器估算。 */
  readonly onComplete: () => void
}

/**
 * 纯展示：白色气泡矩阵覆盖 / 露出。
 * 每个气泡从网格中心原地缩放；延迟由 layout 的 30° 波浪投影给出，整体右→左推进。
 * 不读路由、不写路由，阶段推进由 PageTransitionOverlay 在动画完成回调里驱动。
 */
export function BubbleMatrix({ mode, width, height, onComplete }: BubbleMatrixProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const matrix = useMemo(() => buildBubbleMatrix(width, height), [width, height])
  const initialScale = mode === 'cover' ? 0 : 1
  const targetScale = mode === 'cover' ? 1 : 0
  const freezeAt = mode === 'reveal' ? pageTransitionDebug.freezeRevealAt : null

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    const elements = Array.from(container.children) as HTMLElement[]
    if (elements.length === 0) return

    let cancelled = false
    // 显式给出起止关键帧，避免依赖从 DOM 反读 transform，排除起始值解析失败的可能。
    const animation = animate(
      elements,
      { scale: [initialScale, targetScale] },
      {
        duration: pageTransitionTokens.waveDuration,
        delay: (index) => matrix.bubbles[index]?.delay ?? 0,
        ease: motionTokens.ease.out,
      },
    )

    let freezeTimer: number | null = null

    if (freezeAt === null) {
      void animation.finished
        .catch(() => undefined)
        .then(() => {
          if (!cancelled) onComplete()
        })
    } else {
      // 调试：在整段波浪的指定进度处暂停，不再结束本阶段、不进入 idle。
      const totalSeconds = pageTransitionTokens.maxStagger + pageTransitionTokens.waveDuration
      const progress = Math.max(0, Math.min(1, freezeAt))
      freezeTimer = window.setTimeout(() => {
        animation.pause()
      }, totalSeconds * progress * 1000)
    }

    return () => {
      cancelled = true
      if (freezeTimer !== null) window.clearTimeout(freezeTimer)
      animation.stop()
    }
  }, [matrix, initialScale, targetScale, freezeAt, onComplete])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      data-transition-phase={mode === 'cover' ? 'covering' : 'revealing'}
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {matrix.bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="absolute rounded-full bg-surface-raised"
          style={{
            width: matrix.diameter,
            height: matrix.diameter,
            left: bubble.x - matrix.diameter / 2,
            top: bubble.y - matrix.diameter / 2,
            transform: `scale(${initialScale})`,
            willChange: 'transform',
          }}
        />
      ))}
    </div>
  )
}