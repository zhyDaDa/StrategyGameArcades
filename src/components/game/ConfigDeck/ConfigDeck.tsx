import { MotionConfig, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { motionTokens } from '@/presentation/motion/tokens'

export interface ConfigDeckProps {
  /** 是否翻到右侧的玩家配置页。 */
  readonly open: boolean
  /** 左侧：对局配置主页（含页头）。 */
  readonly main: ReactNode
  /** 右侧：某个席位的玩家配置页；打开前必须已提供内容。 */
  readonly panel: ReactNode
}

/**
 * 配置页的横向翻页：两页并排放在 200% 宽的轨道里，整页向左平移露出右页。
 * 这不是抽屉——它不浮层、不遮罩，也不叠加在主页之上。
 */
export function ConfigDeck({ open, main, panel }: ConfigDeckProps) {
  return (
    /**
     * 本机系统开启了「减少动画效果」时，Motion 会把 x 位移直接跳到终值，
     * 滑页与标签指示就完全消失。翻页是配置页的核心交互反馈，因此只在这个
     * 子树内忽略系统偏好；站内其余页面仍遵循全局 MotionConfig。
     */
    <MotionConfig reducedMotion="never">
      <div className="relative overflow-hidden">
        <motion.div
          className="flex w-[200%] items-stretch"
          initial={false}
          animate={{ x: open ? '-50%' : '0%' }}
          transition={motionTokens.transition.travel}
        >
          <div className="w-1/2 shrink-0" inert={open} aria-hidden={open}>
            {main}
          </div>
          <div className="w-1/2 shrink-0" inert={!open} aria-hidden={!open}>
            {panel}
          </div>
        </motion.div>
      </div>
    </MotionConfig>
  )
}