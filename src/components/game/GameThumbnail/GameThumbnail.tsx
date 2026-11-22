import { motion, MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'
import { motionTokens } from '@/presentation/motion/tokens'

export interface GameThumbnailProps {
  /** 该游戏的静态局面 SVG，由 games/<id>/ui 提供。 */
  readonly children: ReactNode
}

/**
 * 缩略图外壳：把游戏局面做成倾斜的方块，滚动进入视口时从下方带弹性地抬起。
 *
 * 这里局部覆盖 reducedMotion="never"：抬起是本卡片唯一的识别动效，
 * 系统关闭动画时若被静默降级，卡片会完全失去预期表现。
 * 覆盖范围仅限这块缩略图，不影响站内其他动画。
 */
export function GameThumbnail({ children }: GameThumbnailProps) {
  return (
    <MotionConfig reducedMotion="never">
      <div className="grid h-full w-full place-items-center overflow-hidden">
        <motion.div
          className="aspect-square h-[64%] overflow-hidden rounded-lg border shadow-lg ring-1 ring-foreground/10"
          initial={{ y: 56, rotate: -44, opacity: 0 }}
          whileInView={{ y: 0, rotate: -30, opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={motionTokens.spring.pop}
        >
          {children}
        </motion.div>
      </div>
    </MotionConfig>
  )
}