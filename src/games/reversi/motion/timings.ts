type CubicBezier = [number, number, number, number]

/**
 * 黑白棋专属动效节奏。翻面是核心玩法反馈，刻意放慢，
 * 让「夹住 -> 依次翻转」的过程看得清。
 */
export const reversiMotion = {
  /** 棋子落盘：轻量缩放弹入。 */
  place: {
    duration: 0.2,
    ease: [0.34, 1.56, 0.64, 1] satisfies CubicBezier,
  },
  /** 翻面：约半秒的旋转，末尾缓慢落定。 */
  flip: {
    duration: 0.55,
    ease: [0.4, 0, 0.2, 1] satisfies CubicBezier,
  },
}