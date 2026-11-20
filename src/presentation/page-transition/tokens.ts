import { motionTokens } from '@/presentation/motion/tokens'

/**
 * 页面切换专用节奏。公共时长从 motionTokens 取值，
 * 仅这里需要点阵网格、错峰、加载指示器等切换专属参数。
 */
export const pageTransitionTokens = {
  /** 点阵网格边长（px），越大点越少、越大。 */
  cellSize: 140,
  /** 单点直径相对网格边长的倍数，保证相邻圆充分重叠、覆盖无缝隙。 */
  dotDiameterFactor: 2.2,
  /** 单个点放大 / 收缩耗时（秒）；覆盖与露出共用，速度完全一致。 */
  dotDuration: motionTokens.duration.deliberate,
  /** 相邻列之间的错峰间隔（秒）：覆盖从右往左，露出从左往右。 */
  columnStagger: 0.045,
  /** 动画结束后的提交缓冲（秒），避免边缘尚有缝隙时就切换路由。 */
  settleBuffer: 0.04,
  /** 加载指示器淡入延迟（秒）。 */
  spinnerDelay: 0.12,
  spinnerFadeDuration: motionTokens.duration.quick,
  /**
   * loading 阶段的最短停留（秒，从点阵完全覆盖开始计）。
   * 与网络速度解耦：页面再快，spinner 也必须完整出现并停留一小段时间后才露出新页面。
   */
  loadingMinDuration: 0.8,
} as const