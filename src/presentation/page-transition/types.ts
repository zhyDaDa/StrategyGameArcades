/**
 * 一次页面切换的视觉阶段，与路由状态机解耦：
 * - covering：旧页面被白色点阵覆盖（退出动画）
 * - loading：完全覆盖后只有加载指示器，按 loadingMinDuration 强制停留最短时间
 * - revealing：新页面就绪，白色点阵收缩露出页面（入场动画）
 */
export type PageTransitionPhase = 'covering' | 'loading' | 'revealing'

export interface PageTransitionOverlayProps {
  readonly phase: PageTransitionPhase
  readonly onCoverComplete: () => void
  readonly onRevealComplete: () => void
}