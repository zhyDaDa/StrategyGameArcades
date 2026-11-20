import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { motionTokens } from '@/presentation/motion/tokens'
import { BubbleMatrix } from './BubbleMatrix'
import { LoadingIndicator } from './LoadingIndicator'
import { pageTransitionDebug } from './tokens'
import type { PageTransitionOverlayProps } from './types'

function readViewport() {
  return { width: window.innerWidth, height: window.innerHeight }
}

/**
 * 页面切换遮罩。只负责三件事：演出的像素、气泡动画完成回调、在必要阶段拦截交互。
 * 背景层（气泡矩阵 / 纯色 loading / 减少动态效果时的淡入淡出）与加载指示器分层渲染：
 * 指示器跨阶段保持挂载，在覆盖波浪后半段提前淡入、揭示波浪过半后淡出。
 * 不读路由、不写路由，接入方通过 phase + 两个回调驱动它。
 */
export function PageTransitionOverlay({
  phase,
  onCoverComplete,
  onRevealComplete,
}: PageTransitionOverlayProps) {
  // forceWave 为调试开关：系统开启「减少动态效果」时也强制播放气泡波浪。
  const prefersReducedMotion = useReducedMotion() === true && !pageTransitionDebug.forceWave
  const [viewport, setViewport] = useState(readViewport)

  // 转场只持续一秒左右，但旋转设备 / 拖拽窗口时仍保持网格贴合视口。
  useEffect(() => {
    const handleResize = () => setViewport(readViewport())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <>
      {phase === 'loading' ? (
        <div
          aria-hidden="true"
          data-transition-phase="loading"
          className="fixed inset-0 z-50 bg-surface-raised"
        />
      ) : prefersReducedMotion ? (
        <motion.div
          aria-hidden="true"
          data-transition-phase={phase}
          className="fixed inset-0 z-50 bg-surface-raised"
          initial={{ opacity: phase === 'covering' ? 0 : 1 }}
          animate={{ opacity: phase === 'covering' ? 1 : 0 }}
          transition={{ duration: motionTokens.duration.quick }}
          onAnimationComplete={phase === 'covering' ? onCoverComplete : onRevealComplete}
        />
      ) : (
        <BubbleMatrix
          mode={phase === 'covering' ? 'cover' : 'reveal'}
          width={viewport.width}
          height={viewport.height}
          onComplete={phase === 'covering' ? onCoverComplete : onRevealComplete}
        />
      )}

      <LoadingIndicator phase={phase} reducedMotion={prefersReducedMotion} />
    </>
  )
}