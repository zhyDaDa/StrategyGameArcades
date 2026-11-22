import { motion, MotionConfig, useInView } from 'motion/react'
import { useRef, type ReactNode } from 'react'
import { motionTokens } from '@/presentation/motion/tokens'

export interface GameThumbnailProps {
  /** 整张卡片是否被悬停；悬停时缩略图会从「露出 2/3」继续弹到完全露出。 */
  readonly hovered: boolean
  /** 该游戏的静态局面 SVG，由 games/<id>/ui 提供。 */
  readonly children: ReactNode
}

/** 静止时下沿约 1/3 被卡片边界裁掉；滚入动画从只露出 1/3 弹到这个高度。 */
const PEEK_Y = '61%'
const HIDDEN_Y = '95%'

/**
 * 缩略图外壳：倾斜方块，滚动进入视口时从下方带弹性地抬起，
 * 并停在部分被裁切的位置；整张卡片悬停时再弹到完全露出。
 *
 * 这里局部覆盖 reducedMotion="never"：这套抬起是卡片唯一的识别动效，
 * 系统关闭动画时若被静默降级，卡片会完全失去预期表现。
 * 覆盖范围仅限这块缩略图，不影响站内其他动画。
 */
export function GameThumbnail({ hovered, children }: GameThumbnailProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const inView = useInView(frameRef, { once: true, amount: 0.6 })

  return (
    <MotionConfig reducedMotion="never">
      <div
        ref={frameRef}
        className="grid h-full w-full place-items-center overflow-hidden"
      >
        <motion.div
          className="aspect-square h-[64%] overflow-hidden rounded-lg border shadow-lg ring-1 ring-foreground/10"
          initial={{ y: HIDDEN_Y, rotate: -44, opacity: 0 }}
          animate={
            inView
              ? { y: hovered ? '0%' : PEEK_Y, rotate: -30, opacity: 1 }
              : { y: HIDDEN_Y, rotate: -44, opacity: 0 }
          }
          transition={{
            ...motionTokens.spring.pop,
            opacity: {
              duration: motionTokens.duration.normal,
              ease: motionTokens.ease.out,
            },
          }}
        >
          {children}
        </motion.div>
      </div>
    </MotionConfig>
  )
}