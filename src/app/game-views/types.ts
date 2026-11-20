import type { ComponentType } from 'react'
import type { MatchStartPayload } from '../match-storage'

export interface GameViewEntry {
  readonly Config: ComponentType<{
    readonly onStart: (payload: MatchStartPayload) => void
  }>
  readonly Match: ComponentType
}