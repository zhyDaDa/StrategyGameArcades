/** Action 基本约定：所有行为都是 JSON 安全的、以 `type` 区分联合的对象。 */
export interface ActionBase {
  readonly type: string
}

/**
 * 结构化行为的规范化比较：用于把候选 Action 与合法 Action 集合作等价判断，
 * 避免用 `legalActions.includes(action)` 比较两个独立 JSON 对象的引用。
 */
export function isSameAction(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}