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
}

/** 接入方式的唯一来源：标签、配色、能否开局都从这里取。 */
export const SEAT_KIND_META: Record<SeatType, SeatKindMeta> = {
  human: {
    id: 'human',
    label: '人类',
    hint: '本机热座',
    description: '由本机玩家轮流操作，适合线下同桌对弈。',
    accent: 'primary',
  },
  algorithm: {
    id: 'algorithm',
    label: '算法',
    hint: '内置 / 编写策略',
    description: '使用内置启发式，或在浏览器沙箱中运行你自己的 JavaScript 策略。',
    accent: 'green',
  },
  llm: {
    id: 'llm',
    label: '大模型',
    hint: '云端推理',
    description: '用自己的 API Key 直连云端模型；密钥只留在你的浏览器里。',
    accent: 'blue',
  },
  local: {
    id: 'local',
    label: '小模型',
    hint: '本地推理',
    description: '连接本机模型服务或本地决策服务，棋局数据不经过本站服务器。',
    accent: 'secondary',
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
    readonly softBg: string
    readonly dot: string
    readonly hoverText: string
  }
> = {
  primary: {
    text: 'text-primary',
    softBg: 'bg-primary/10',
    dot: 'bg-primary',
    hoverText: 'group-hover/item:text-primary',
  },
  blue: {
    text: 'text-[var(--color-blue)]',
    softBg: 'bg-[var(--color-blue)]/10',
    dot: 'bg-[var(--color-blue)]',
    hoverText: 'group-hover/item:text-[var(--color-blue)]',
  },
  green: {
    text: 'text-[var(--color-green)]',
    softBg: 'bg-[var(--color-green)]/10',
    dot: 'bg-[var(--color-green)]',
    hoverText: 'group-hover/item:text-[var(--color-green)]',
  },
  secondary: {
    text: 'text-secondary',
    softBg: 'bg-secondary/10',
    dot: 'bg-secondary',
    hoverText: 'group-hover/item:text-secondary',
  },
}