/**
 * 展示字段既可以是静态值，也可以是根据 Context 计算的函数。
 * 只对返回值不可能是函数的展示字段（desc、label、visible 等）使用此简化方案。
 */
export type Derived<T, C> = T | ((ctx: Readonly<C>) => T)

export function resolveDerived<T, C>(value: Derived<T, C>, ctx: Readonly<C>): T {
  return typeof value === 'function' ? (value as (ctx: Readonly<C>) => T)(ctx) : value
}