import type { MotionProps } from 'motion/react'
import { motionTokens } from './tokens'

/** 进入：轻微上移淡入。 */
export const fadeInUp: MotionProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: motionTokens.duration.normal, ease: motionTokens.ease.out },
}

/** 落子 / 弹入：轻微缩放回弹。 */
export const popIn: MotionProps = {
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: motionTokens.duration.quick, ease: motionTokens.ease.back },
}

/** 退出：收缩淡出。 */
export const fadeOut: MotionProps = {
  exit: { opacity: 0, scale: 0.9 },
  transition: { duration: motionTokens.duration.quick, ease: motionTokens.ease.out },
}