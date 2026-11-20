/**
 * 一次页面切换的视觉阶段，与路由状态机解耦：
 * - covering：气泡矩阵从右往左呈 30° 斜向波浪放大，铺满视口
 * - loading：完全覆盖后保持纯色，中央显示加载指示器（最短停留由路由层控制）
 * - revealing：同一批气泡按相同波浪从右往左收缩，露出新页面
 */
export type PageTransitionPhase = 'covering' | 'loading' | 'revealing'

export interface PageTransitionOverlayProps {
  readonly phase: PageTransitionPhase
  readonly onCoverComplete: () => void
  readonly onRevealComplete: () => void
}