type CubicBezier = [number, number, number, number]

/**
 * 公共缓动曲线。
 * - travel：位置标识在既有锚点之间切换（当前玩家衬底、可落区域框、标签指示器）。
 * - emphasis：原地缩放脉冲（箭头、分数等），起手快、带过冲与回压。
 */
const TRAVEL_EASE = [0.86, 0, 0.07, 1] satisfies CubicBezier
const EMPHASIS_EASE = [0.16, 1.5, 0.3, 1] satisfies CubicBezier

/** 动效节奏与缓动统一从 token 获取，禁止散落各处魔法数字。 */
export const motionTokens = {
  duration: {
    instant: 0.08,
    quick: 0.16,
    normal: 0.24,
    deliberate: 0.42,
    ceremonial: 0.8,
  },
  ease: {
    out: [0.22, 1, 0.36, 1] satisfies CubicBezier,
    back: [0.34, 1.56, 0.64, 1] satisfies CubicBezier,
    travel: TRAVEL_EASE,
    emphasis: EMPHASIS_EASE,
  },
  /**
   * 成组语义过渡：优先整组复用，不要自己重新拼时长与曲线。
   * travel 用于任何「标识物在位置之间切换」，emphasis 用于原地脉冲强调。
   */
  transition: {
    travel: { duration: 0.36, ease: TRAVEL_EASE },
    emphasis: { duration: 0.48, ease: EMPHASIS_EASE },
  },
  spring: {
    /** 卡片缩略图从缩略区里弹起：略低的阻尼让它在终点附近回弹一次。 */
    pop: {
      type: 'spring',
      stiffness: 210,
      damping: 15,
      mass: 0.9,
    } satisfies SpringTransition,
  },
}

interface SpringTransition {
  readonly type: 'spring'
  readonly stiffness: number
  readonly damping: number
  readonly mass: number
}