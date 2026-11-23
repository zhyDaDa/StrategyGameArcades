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
 * 纵向接入方式标签。选中态只做两件事：文字染上该接入方式的主题色、
 * 所在的整行轻微放大（transform，不撑开文档流）。
 *
 * 右侧竖线与折角共同构成指示器：竖线随选中项变色并加粗；折角是用背景色
 * 盖掉竖线中段、只留下上下两条粗边形成的向左弯折，沿竖线在各项之间平滑切换。
 */
export function SeatConfigTabs({ activeType, onChange }: SeatConfigTabsProps) {
  const activeIndex = SEAT_TYPES.indexOf(activeType)
  const activeAccent = SEAT_ACCENT_CLASS[SEAT_KIND_META[activeType].accent]

  return (
    <nav aria-label="接入方式" className="relative py-6">
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
                  'group/item flex h-18 w-full origin-left items-center gap-3 rounded-xl px-4 text-left',
                  'outline-none transition-transform duration-200 ease-out',
                  active ? 'scale-[1.03]' : '',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex size-9 shrink-0 items-center justify-center rounded-lg border border-border transition-colors duration-200',
                    active ? accent.text : 'text-muted-foreground',
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
              </button>
            </li>
          )
        })}
      </ul>

      {/* 竖线：随选中项变色并加粗 */}
      <div
        aria-hidden="true"
        className={[
          'pointer-events-none absolute inset-y-6 right-0 z-0 w-[3px] rounded-full transition-colors duration-500 ease-in-out',
          activeAccent.dot,
        ].join(' ')}
      />

      {/* 折角：背景色遮掉竖线中段，上下两条粗边形成向左的弯折 */}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ y: activeIndex * TAB_ROW_HEIGHT }}
        transition={motionTokens.transition.travel}
        className="pointer-events-none absolute right-0 top-6 z-10 h-18 w-0"
      >
        <svg
          width="14"
          height="20"
          viewBox="0 0 14 20"
          className={[
            'absolute right-0 top-1/2 -translate-y-1/2 transition-colors duration-500 ease-in-out',
            activeAccent.text,
          ].join(' ')}
          fill="none"
        >
          <rect x="11" y="3" width="3" height="14" fill="var(--background)" />
          <path
            d="M 12 3 L 2 10 L 12 17"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </nav>
  )
}