import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { motionTokens } from '@/presentation/motion/tokens'
import { BubbleMatrix } from './BubbleMatrix'
import type { PageTransitionOverlayProps } from './types'

function readViewport() {
  return { width: window.innerWidth, height: window.innerHeight }
}

/**
 * 页面切换遮罩。只负责三件事：演出的像素、气泡动画完成回调、在必要阶段拦截交互。
 * 不读路由、不写路由，接入方通过 phase + 两个回调驱动它。
 */
export function PageTransitionOverlay({
  phase,
  onCoverComplete,
  onRevealComplete,
}: PageTransitionOverlayProps) {
  const prefersReducedMotion = useReducedMotion() === true
  const [viewport, setViewport] = useState(readViewport)

  // 转场只持续一秒左右，但旋转设备 / 拖拽窗口时仍保持网格贴合视口。
  useEffect(() => {
    const handleResize = () => setViewport(readViewport())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 减少动态效果：不做波浪，用短促的纯色淡入 / 淡出完成同样的阶段切换。
  if (phase === 'loading') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-surface-raised"
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
            transition={{ duration: motionTokens.duration.quick }}
          />
        )}
      </div>
    )
  }

  if (prefersReducedMotion) {
    const mode = phase === 'covering' ? 'cover' : 'reveal'
    return (
      <motion.div
        aria-hidden="true"
        className="fixed inset-0 z-50 bg-surface-raised"
        initial={{ opacity: mode === 'cover' ? 0 : 1 }}
        animate={{ opacity: mode === 'cover' ? 1 : 0 }}
        transition={{ duration: motionTokens.duration.quick }}
        onAnimationComplete={mode === 'cover' ? onCoverComplete : onRevealComplete}
      />
    )
  }

  return (
    <BubbleMatrix
      mode={phase === 'covering' ? 'cover' : 'reveal'}
      width={viewport.width}
      height={viewport.height}
      onComplete={phase === 'covering' ? onCoverComplete : onRevealComplete}
    />
  )
}