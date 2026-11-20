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
  waveDuration: 0.6,
  /** 整个矩阵的首尾延迟差（秒）；相邻气泡延迟连续变化。 */
  maxStagger: 0.45,
  /** loading 阶段最短停留（秒）；页面再快也让加载指示器完整出现一次。 */
  loadingMinDuration: 0.5,
} as const

/**
 * 调试开关。正式发布时把 freezeRevealAt 设为 null；
 * forceWave 是否关闭取决于是否要让系统「减少动态效果」用户看到简化转场。
 */
export const pageTransitionDebug = {
  /**
   * 忽略系统 prefers-reduced-motion，强制播放气泡波浪。
   * 若浏览器/系统开启了「减少动态效果」，转场原本会退化为纯色淡入淡出，
   * 气泡根本不会渲染；调试气泡效果时需保持 true。
   */
  forceWave: true,
  /**
   * reveal 动画播到该进度（0~1）时暂停并停在画面上，之后不再进入 idle，
   * 便于观察退场/进场的中间状态。null 表示正常播放到底。
   */
  freezeRevealAt: null as number | null,
}