import type { SeatType } from './types'

/** 四种接入方式共用一套配色键，对应 styles/global.css 里的四个标准色。 */
export type SeatAccent = 'primary' | 'blue' | 'green' | 'secondary'

export interface SeatKindMeta {
  readonly id: SeatType
  readonly label: string
  readonly hint: string
  /** 该接入方式承担什么决策，用于配置面板的说明。 */
  readonly description: string
  readonly accent: SeatAccent
  /** 本阶段是否已接通对局；未接通的接入方式只保留配置位。 */
  readonly playable: boolean
}

/** 接入方式的唯一来源：标签、配色、能否开局都从这里取。 */
export const SEAT_KIND_META: Record<SeatType, SeatKindMeta> = {
  human: {
    id: 'human',
    label: '人类',
    hint: '本机热座',
    description: '由本机玩家轮流操作，适合线下同桌对弈。',
    accent: 'primary',
    playable: true,
  },
  algorithm: {
    id: 'algorithm',
    label: '算法',
    hint: '内置启发式',
    description: '使用游戏内置的启发式搜索，不依赖网络，开箱即用。',
    accent: 'green',
    playable: true,
  },
  llm: {
    id: 'llm',
    label: '大模型',
    hint: '云端推理',
    description: '通过兼容接口接入云端大模型，作为该席位的决策者。',
    accent: 'blue',
    playable: false,
  },
  local: {
    id: 'local',
    label: '小模型',
    hint: '本地推理',
    description: '在本地运行的小参数模型，适合离线与低延迟场景。',
    accent: 'secondary',
    playable: false,
  },
}

/**
 * 主题色 → Tailwind 类名。写死字面量而不是拼接，保证 Tailwind 能扫描到；
 * blue / green 没有语义 token，直接引用 global.css 的自定义属性。
 */
export const SEAT_ACCENT_CLASS: Record<
  SeatAccent,
  {
    readonly text: string
    readonly outline: string
    readonly softBg: string
    readonly dot: string
    readonly hoverText: string
  }
> = {
  primary: {
    text: 'text-primary',
    outline: 'outline-primary',
    softBg: 'bg-primary/10',
    dot: 'bg-primary',
    hoverText: 'group-hover/item:text-primary',
  },
  blue: {
    text: 'text-[var(--color-blue)]',
    outline: 'outline-[var(--color-blue)]',
    softBg: 'bg-[var(--color-blue)]/10',
    dot: 'bg-[var(--color-blue)]',
    hoverText: 'group-hover/item:text-[var(--color-blue)]',
  },
  green: {
    text: 'text-[var(--color-green)]',
    outline: 'outline-[var(--color-green)]',
    softBg: 'bg-[var(--color-green)]/10',
    dot: 'bg-[var(--color-green)]',
    hoverText: 'group-hover/item:text-[var(--color-green)]',
  },
  secondary: {
    text: 'text-secondary',
    outline: 'outline-secondary',
    softBg: 'bg-secondary/10',
    dot: 'bg-secondary',
    hoverText: 'group-hover/item:text-secondary',
  },
}