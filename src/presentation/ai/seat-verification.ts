import {
  AI_KINDS_BY_SEAT_TYPE,
  aiConfigFingerprint,
  aiSeatConfigSchema,
  type AiSeatConfig,
} from '@/presentation/match-setup/ai-config'
import type { SeatAssignment } from '@/presentation/match-setup/types'

/** 本次配置会话内的测试结果；不持久化，刷新后必须重新测试。 */
export interface SeatVerification {
  readonly fingerprint: string
  readonly summary: string
  readonly at: number
}

export type SeatVerificationMap = Readonly<Record<string, SeatVerification>>

export interface SeatIssue {
  readonly seatId: string
  readonly message: string
}

export function resolveSeatAi(seat: SeatAssignment<string>): AiSeatConfig | undefined {
  if (seat.ai !== undefined) {
    return seat.ai
  }
  if (seat.type === 'algorithm') {
    return { kind: 'builtin' }
  }
  return undefined
}

/**
 * 开局前的统一校验：AI 配置必须完整，且当前配置指纹已经过真实测试。
 * 任何一个席位有问题都不允许开局，避免「配了但没接上」的假象。
 */
export function collectSeatIssues(
  seats: readonly SeatAssignment<string>[],
  verifications: SeatVerificationMap,
): SeatIssue[] {
  const issues: SeatIssue[] = []
  for (const seat of seats) {
    if (seat.type === 'human') {
      continue
    }
    const ai = resolveSeatAi(seat)
    if (ai === undefined) {
      issues.push({ seatId: seat.id, message: `席位「${seat.id}」尚未选择 AI 接入方式。` })
      continue
    }
    const parsed = aiSeatConfigSchema.safeParse(ai)
    if (!parsed.success) {
      issues.push({
        seatId: seat.id,
        message: `席位「${seat.id}」配置不完整：${parsed.error.issues.map((issue) => issue.message).join('；')}`,
      })
      continue
    }
    if (parsed.data.kind === 'builtin') {
      continue
    }
    if (!AI_KINDS_BY_SEAT_TYPE[seat.type].includes(parsed.data.kind)) {
      issues.push({
        seatId: seat.id,
        message: `席位「${seat.id}」的接入方式与该 AI 配置不匹配。`,
      })
      continue
    }
    const verification = verifications[seat.id]
    if (verification === undefined) {
      issues.push({ seatId: seat.id, message: `席位「${seat.id}」还没有通过接入测试。` })
      continue
    }
    if (verification.fingerprint !== aiConfigFingerprint(parsed.data)) {
      issues.push({ seatId: seat.id, message: `席位「${seat.id}」的配置已修改，需要重新测试。` })
    }
  }
  return issues
}

export function isSeatVerified(
  seat: SeatAssignment<string>,
  verifications: SeatVerificationMap,
): boolean {
  return collectSeatIssues([seat], verifications).length === 0
}