type CubicBezier = [number, number, number, number]

/**
 * 方格大战专属动效节奏。通用节奏放在 presentation/motion/tokens，
 * 这里的时长与曲线服务于本游戏更「重」的实体桌游手感。
 */
export const dotsMotion = {
  /** 画线：从粗到细、由浅到深；刻意放慢，保证能看清。 */
  lineDraw: {
    duration: 0.7,
    ease: [0.22, 1, 0.36, 1] satisfies CubicBezier,
  },
  /** 当前玩家衬底：慢起步、中段加速、末尾明显减速并刹停。 */
  slabMove: {
    duration: 0.36,
    ease: [0.86, 0, 0.07, 1] satisfies CubicBezier,
  },
  /** 得分续手时三角箭头放大再缩小。 */
  arrowPulse: {
    duration: 0.48,
    ease: [0.37, 0, 0.63, 1] satisfies CubicBezier,
  },
  /** 分数数字的短脉冲。 */
  scorePulse: {
    duration: 0.5,
    ease: [0.34, 1.2, 0.64, 1] satisfies CubicBezier,
  },
}