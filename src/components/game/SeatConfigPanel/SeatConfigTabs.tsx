import { ChevronLeft } from 'lucide-react'
import { motion } from 'motion/react'
import { motionTokens } from '@/presentation/motion/tokens'
import { SEAT_ACCENT_CLASS, SEAT_KIND_META } from '@/presentation/match-setup/seat-kinds'
import { SEAT_TYPES, type SeatType } from '@/presentation/match-setup/types'
import { SeatKindIcon } from '../SeatKindIcon/SeatKindIcon'

/** 每个标签固定高度，指示器才能用简单位移精确对齐。 */
const TAB_ROW_HEIGHT = 72

export interface SeatConfigTabsProps {
  readonly activeType: SeatType
  readonly onChange: (type: SeatType) => void
}

/**
 * 纵向接入方式标签：右侧一条竖线，指示器是线上的向左折角，
 * 随选中项上下移动；悬浮时标签文字放大并染上对应主题色。
 */
export function SeatConfigTabs({ activeType, onChange }: SeatConfigTabsProps) {
  const activeIndex = SEAT_TYPES.indexOf(activeType)
  const activeAccent = SEAT_ACCENT_CLASS[SEAT_KIND_META[activeType].accent]

  return (
    <nav aria-label="接入方式" className="relative">
      <ul className="flex flex-col">
        {SEAT_TYPES.map((type) => {
          const meta = SEAT_KIND_META[type]
          const accent = SEAT_ACCENT_CLASS[meta.accent]
          const active = type === activeType

          return (
            <li key={type}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onChange(type)}
                className={[
                  'group/item flex h-18 w-full items-center gap-3 rounded-xl px-4 text-left',
                  'transition-all duration-200 ease-out',
                  'hover:bg-muted/50',
                  active
                    ? `${accent.softBg} scale-[1.02] outline-2 outline-offset-2 ${accent.outline}`
                    : 'outline-none',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200',
                    active
                      ? `border-transparent ${accent.softBg} ${accent.text}`
                      : 'border-border text-muted-foreground',
                  ].join(' ')}
                >
                  <SeatKindIcon type={type} className="size-4" />
                </span>

                <span className="flex min-w-0 flex-col">
                  <span
                    className={[
                      'text-sm font-medium transition-transform duration-200 ease-out',
                      'group-hover/item:scale-[1.05]',
                      active ? accent.text : `text-foreground ${accent.hoverText}`,
                    ].join(' ')}
                  >
                    {meta.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{meta.hint}</span>
                </span>

                {meta.playable ? null : (
                  <span className="ml-auto shrink-0 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    草稿
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-border"
      />
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ y: activeIndex * TAB_ROW_HEIGHT }}
        transition={motionTokens.transition.travel}
        className="pointer-events-none absolute right-0 top-0 z-10 flex h-18 w-4 -translate-x-1/2 items-center justify-center"
      >
        <span
          className={[
            'flex size-4 items-center justify-center rounded-full bg-card ring-1 ring-border',
            activeAccent.text,
          ].join(' ')}
        >
          <ChevronLeft className="size-3" />
        </span>
      </motion.div>
    </nav>
  )
}