import { z, type ZodType } from 'zod'

/** 存档封套：gameId + rulesVersion + 权威状态。 */
export interface SaveEnvelope<S> {
  readonly gameId: string
  readonly rulesVersion: number
  readonly state: S
}

/**
 * 生成校验存档封套的 Schema。`z.literal` 负责在恢复时
 * 校验 gameId 与 rulesVersion 必须与当前游戏一致，不一致直接抛错。
 */
export function createSaveEnvelopeSchema<S>(
  stateSchema: ZodType<S>,
  gameId: string,
  rulesVersion: number,
) {
  return z.object({
    gameId: z.literal(gameId),
    rulesVersion: z.literal(rulesVersion),
    state: stateSchema,
  })
}