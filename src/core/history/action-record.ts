import type { PlayerId } from '../contracts/player'

/** 一次已提交行动的行为日志条目。 */
export interface ActionRecord<A> {
  readonly sequence: number
  readonly playerId: PlayerId
  readonly action: A
}