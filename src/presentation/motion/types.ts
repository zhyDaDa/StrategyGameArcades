export type CueId = string

/**
 * 一次性的视听演出意图，只描述「表现意图」，不携带具体 motion 参数。
 * 领域 Event 只负责事实；事件 -> cue 的映射放在游戏自己的 motion 目录。
 */
export interface AnimationCue {
  readonly id: CueId
  readonly kind: string
  readonly payload?: Readonly<Record<string, unknown>>
}