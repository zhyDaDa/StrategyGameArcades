import { motionTokens } from '@/presentation/motion/tokens'

/**
 * 方格大战专属动效节奏。位置切换与原地强调等通用语义已提升为
 * presentation/motion/tokens 的公共资产，这里只保留本游戏独有的画线节奏。
 */
export const dotsMotion = {
  /** 画线：从粗到细、由浅到深；刻意放慢，保证能看清。 */
  lineDraw: {
    duration: 0.7,
    ease: motionTokens.ease.out,
  },
}