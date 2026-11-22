type CubicBezier = [number, number, number, number]

/**
 * 中国象棋专属动效节奏：棋子落点略带回弹，被吃子迅速收缩离场。
 * 走子本身以棋盘即时快照为准，动画只做落点反馈，不阻塞规则提交。
 */
export const xiangqiMotion = {
  place: {
    duration: 0.22,
    ease: [0.34, 1.56, 0.64, 1] satisfies CubicBezier,
  },
  capture: {
    duration: 0.32,
    ease: [0.4, 0, 0.2, 1] satisfies CubicBezier,
  },
}