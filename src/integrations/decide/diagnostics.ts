import { isSameAction } from '@/core/contracts/action'
import { HttpDecideClient, type HttpDecideClientOptions } from './client'
import { DECIDE_DIAGNOSTIC_COPY, DecideRequestError, type DecideErrorCode } from './types'

export interface DecideTestInput extends HttpDecideClientOptions {
  readonly gameId: string
  readonly observation: unknown
  readonly legalActions: readonly unknown[]
  readonly turn: number
  readonly playerId: string
  readonly parseAction: (raw: unknown) => unknown
}

export type DecideTestResult =
  | {
      readonly ok: true
      readonly latencyMs: number
      readonly action: unknown
    }
  | {
      readonly ok: false
      readonly code: DecideErrorCode
      readonly title: string
      readonly hint: string
      readonly detail: string | null
      readonly status: number | null
    }

/**
 * 用一份真实的样例局面调用 /decide，并把返回动作按游戏 schema 与合法集合校验。
 * 只有「服务可达 + 协议正确 + 返回合法动作」才算连接成功。
 */
export async function testDecideEndpoint(
  input: DecideTestInput,
  signal: AbortSignal,
): Promise<DecideTestResult> {
  const startedAt = Date.now()
  try {
    const client = new HttpDecideClient(input)
    const raw = await client.request(
      {
        game: input.gameId,
        observation: input.observation,
        legalActions: input.legalActions,
        turn: input.turn,
        playerId: input.playerId,
      },
      signal,
    )
    const action = input.parseAction(raw)
    if (!input.legalActions.some((legal) => isSameAction(legal, action))) {
      throw new DecideRequestError('bad-response', '返回的动作不在合法动作集合中。', {
        detail: JSON.stringify(raw).slice(0, 200),
      })
    }
    return { ok: true, latencyMs: Date.now() - startedAt, action }
  } catch (error) {
    if (error instanceof DecideRequestError) {
      const copy = DECIDE_DIAGNOSTIC_COPY[error.code]
      return {
        ok: false,
        code: error.code,
        title: copy.title,
        hint: copy.hint,
        detail: error.detail,
        status: error.status,
      }
    }
    const copy = DECIDE_DIAGNOSTIC_COPY.aborted
    return {
      ok: false,
      code: signal.aborted ? 'aborted' : 'bad-response',
      title: signal.aborted ? copy.title : DECIDE_DIAGNOSTIC_COPY['bad-response'].title,
      hint: signal.aborted ? copy.hint : DECIDE_DIAGNOSTIC_COPY['bad-response'].hint,
      detail: error instanceof Error ? error.message : String(error),
      status: null,
    }
  }
}