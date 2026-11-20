import { motion } from 'motion/react'
import { motionTokens } from '@/presentation/motion/tokens'
import { buildDotGrid } from './layout'
import { pageTransitionTokens } from './tokens'

export type DotCurtainMode = 'cover' | 'reveal'

interface DotCurtainProps {
  readonly mode: DotCurtainMode
  readonly width: number
  readonly height: number
}

/**
 * 纯展示：白色点阵覆盖 / 露出。
 * cover 从右往左逐列放大，reveal 从左往右逐列收缩。
 * 不关心路由，也不触发任何回调；阶段推进由 PageTransitionOverlay 计时。
 */
export function DotCurtain({ mode, width, height }: DotCurtainProps) {
  const grid = buildDotGrid(width, height)
  const diameter = pageTransitionTokens.cellSize * pageTransitionTokens.dotDiameterFactor
  const initialScale = mode === 'cover' ? 0 : 1
  const finalScale = mode === 'cover' ? 1 : 0

  return (
    <div aria-hidden="true" className="fixed inset-0 z-50 overflow-hidden">
      {grid.dots.map((dot) => {
        const columnOrder =
          mode === 'cover' ? grid.columns - 1 - dot.column : dot.column
        const delay = columnOrder * pageTransitionTokens.columnStagger

        return (
          <motion.span
            key={dot.id}
            className="absolute rounded-full bg-background"
            style={{
              width: diameter,
              height: diameter,
              left: dot.x - diameter / 2,
              top: dot.y - diameter / 2,
              willChange: 'transform',
            }}
            initial={{ scale: initialScale }}
            animate={{ scale: finalScale }}
            transition={{
              duration: pageTransitionTokens.dotDuration,
              delay,
              ease: motionTokens.ease.out,
            }}
          />
        )
      })}
    </div>
  )
}