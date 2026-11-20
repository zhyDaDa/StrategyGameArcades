/**
 * Bubble Matrix 页面转场参数。所有节奏集中在这里，方便整体微调。
 * 颜色不走这里：气泡使用 styles/global.css 的 --surface-raised（背景高亮色），
 * 保证在 light / dark 两种主题下都与页面底色有明显区别。
 */
export const pageTransitionTokens = {
  /** 网格基准边长（px）；实际单元会按视口均分后略作调整。 */
  cellSize: 64,
  /** 气泡数量上限；超大视口自动放大单元，避免上千个动画拖慢低性能设备。 */
  maxBubbleCount: 900,
  /** 气泡直径在网格对角线上的冗余（px），避免满屏后留下缝隙。 */
  bubbleOverlap: 2,
  /** 斜向波浪前沿相对垂直方向的倾角（度）。 */
  waveAngle: 30,
  /** 单个气泡放大 / 收缩耗时（秒），覆盖与露出共用。 */
  waveDuration: 0.62,
  /** 整个矩阵的首尾延迟差（秒）；相邻气泡延迟连续变化。 */
  maxStagger: 0.55,
  /** loading 阶段最短停留（秒）；页面再快也让加载指示器完整出现一次。 */
  loadingMinDuration: 0.35,
} as const