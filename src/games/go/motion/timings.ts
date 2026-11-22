type CubicBezier = [number, number, number, number]

/**
 * 围棋专属动效节奏。落子与提子都是核心玩法反馈，
 * 用短促的缩放表现「棋子接触棋盘 / 被拿离棋盘」。
 */
export const goMotion = {
  /** 落子：轻量弹入，不拖慢连续打谱。 */
  place: {
    duration: 0.16,
    ease: [0.34, 1.56, 0.64, 1] satisfies CubicBezier,
  },
  /** 提子：快速缩小淡出。 */
  capture: {
    duration: 0.18,
    ease: [0.4, 0, 1, 1] satisfies CubicBezier,
  },
}