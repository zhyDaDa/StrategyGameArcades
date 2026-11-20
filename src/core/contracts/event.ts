/** GameEvent 基本约定：领域事件是规则确认后的事实，以 `type` 区分。 */
export interface GameEventBase {
  readonly type: string
}