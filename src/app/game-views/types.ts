import type { ComponentType, ReactNode } from 'react'
import type { MatchStartPayload } from '../match-storage'

export interface GameViewEntry {
  readonly Config: ComponentType<{
    /** 配置页标题区，由配置路由生成（游戏名、规则摘要等）。 */
    readonly header: ReactNode
    readonly onStart: (payload: MatchStartPayload) => void
  }>
  readonly Match: ComponentType
}