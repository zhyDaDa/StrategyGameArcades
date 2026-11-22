import { GitBranch, Globe, PenLine, type LucideIcon } from 'lucide-react'

interface AuthorLinkItem {
  readonly label: string
  readonly value: string
  readonly href: string
  readonly icon: LucideIcon
  /** 右侧附带的 shields.io 徽章，目前只有仓库需要展示 star 数。 */
  readonly badge?: string
}

const STAR_BADGE =
  'https://img.shields.io/github/stars/zhyDaDa/StrategyGameArcades?style=flat-square&label=STAR&logo=github&logoColor=faf7f0&labelColor=262a25&color=aa6048'

const AUTHOR_LINKS: readonly AuthorLinkItem[] = [
  {
    label: '主站',
    value: 'www.zhydada.com',
    href: 'https://www.zhydada.com',
    icon: Globe,
  },
  {
    label: '博客',
    value: 'origin.zhydada.com',
    href: 'https://origin.zhydada.com',
    icon: PenLine,
  },
  {
    label: '开源仓库',
    value: 'zhyDaDa/StrategyGameArcades',
    href: 'https://github.com/zhyDaDa/StrategyGameArcades',
    icon: GitBranch,
    badge: STAR_BADGE,
  },
]

/** 首页作者信息：主站、博客与项目仓库，仓库附带实时 star 徽章。 */
export function AuthorLinks() {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="author-links-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="author-links-heading"
          className="text-xs font-medium tracking-[0.2em] text-muted-foreground"
        >
          联系作者 / CONTACT
        </h2>
        <p className="text-xs text-muted-foreground">欢迎来玩、来提 issue、来点 star</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {AUTHOR_LINKS.map(({ label, value, href, icon: Icon, badge }) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="group flex h-full items-center gap-3 rounded-xl border bg-card px-4 py-3 ring-1 ring-foreground/5 transition-colors hover:border-primary/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Icon
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="truncate text-sm font-medium">{value}</span>
              </span>
              {badge === undefined ? null : (
                <img
                  src={badge}
                  alt="GitHub Star 数"
                  loading="lazy"
                  decoding="async"
                  className="ml-auto h-5 shrink-0"
                />
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}