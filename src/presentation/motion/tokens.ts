type CubicBezier = [number, number, number, number]

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
  },
}