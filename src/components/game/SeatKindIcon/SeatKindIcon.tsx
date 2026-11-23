import { Boxes, Cpu, Sparkles, User } from 'lucide-react'
import type { SeatType } from '@/presentation/match-setup/types'

const SEAT_KIND_ICONS = {
  human: User,
  algorithm: Cpu,
  llm: Sparkles,
  local: Boxes,
} satisfies Record<SeatType, typeof User>

export interface SeatKindIconProps {
  readonly type: SeatType
  readonly className?: string
}

/** 四种接入方式的图形符号，与 seat-kinds 的配色一起构成席位视觉语言。 */
export function SeatKindIcon({ type, className }: SeatKindIconProps) {
  const Icon = SEAT_KIND_ICONS[type]
  return <Icon className={className} aria-hidden="true" />
}