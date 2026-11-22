import { motion, type Variants } from 'motion/react'
import type { ReactNode } from 'react'
import { motionTokens } from '@/presentation/motion/tokens'

export interface HeroTitleLine {
  readonly text: string
  /** 强调行使用暖色主色并带一条手绘感的底线。 */
  readonly accent?: boolean
}

export interface HeroSectionProps {
  readonly eyebrow: string
  readonly title: readonly HeroTitleLine[]
  readonly description: ReactNode
  readonly highlights: readonly string[]
}

/** 首屏各元素依次浮现的间隔，仅服务于这一段入场节奏。 */
const STAGGER_DELAY = 0.08

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: STAGGER_DELAY } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionTokens.duration.deliberate,
      ease: motionTokens.ease.out,
    },
  },
}

/** 首页首屏：宣言式大标题 + 一句话定位 + 能力标签，只负责排版。 */
export function HeroSection({
  eyebrow,
  title,
  description,
  highlights,
}: HeroSectionProps) {
  return (
    <section className="relative isolate overflow-hidden border-b pb-10">
      <span
        aria-hidden
        className="pointer-events-none absolute -top-8 right-0 hidden select-none text-[8rem] font-black leading-none tracking-[0.06em] text-foreground/5 lg:block"
      >
        ARCADES
      </span>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6"
      >
        <motion.p
          variants={item}
          className="flex items-center gap-3 text-xs font-medium tracking-[0.24em] text-muted-foreground"
        >
          <span aria-hidden className="size-1.5 rotate-45 bg-primary" />
          {eyebrow}
        </motion.p>
        <motion.h1
          variants={item}
          className="flex flex-col text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
        >
          {title.map((line) => (
            <span key={line.text} className="block">
              {line.accent === true ? (
                <span className="relative inline-block text-primary">
                  {line.text}
                  <span
                    aria-hidden
                    className="absolute inset-x-0 -bottom-1.5 h-1 rounded-full bg-primary/25"
                  />
                </span>
              ) : (
                line.text
              )}
            </span>
          ))}
        </motion.h1>
        <motion.p
          variants={item}
          className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          {description}
        </motion.p>
        <motion.ul variants={item} className="flex flex-wrap gap-2 pt-1">
          {highlights.map((highlight) => (
            <li
              key={highlight}
              className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground"
            >
              {highlight}
            </li>
          ))}
        </motion.ul>
      </motion.div>
    </section>
  )
}