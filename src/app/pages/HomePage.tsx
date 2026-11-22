import type { ReactNode } from 'react'
import { GameCard } from '@/components/game/GameCard/GameCard'
import { GameThumbnail } from '@/components/game/GameThumbnail/GameThumbnail'
import { AuthorLinks } from '@/components/home/AuthorLinks/AuthorLinks'
import { HeroSection } from '@/components/home/HeroSection/HeroSection'
import { BuildStamp } from '@/components/layout/BuildStamp/BuildStamp'
import { ChessThumbnail } from '@/games/chess/ui/ChessThumbnail'
import { DotsAndBoxesThumbnail } from '@/games/dots-and-boxes/ui/DotsAndBoxesThumbnail'
import { GoThumbnail } from '@/games/go/ui/GoThumbnail'
import { GomokuThumbnail } from '@/games/gomoku/ui/GomokuThumbnail'
import { NestedTicTacToeThumbnail } from '@/games/nested-tic-tac-toe/ui/NestedTicTacToeThumbnail'
import { ReversiThumbnail } from '@/games/reversi/ui/ReversiThumbnail'
import { XiangqiThumbnail } from '@/games/xiangqi/ui/XiangqiThumbnail'
import { GAMES, type GameId } from '@/games/registry'
import { Link } from '@/routers/Link'

/** 首页每张卡片的静态局面图；游戏专属画面留在各自 games/<id>/ui。 */
const GAME_ART: Record<GameId, () => ReactNode> = {
  gomoku: GomokuThumbnail,
  go: GoThumbnail,
  reversi: ReversiThumbnail,
  xiangqi: XiangqiThumbnail,
  chess: ChessThumbnail,
  'dots-and-boxes': DotsAndBoxesThumbnail,
  'nested-tic-tac-toe': NestedTicTacToeThumbnail,
}

const cardLinkClassName = [
  'block rounded-xl outline-none transition-transform',
  'motion-safe:hover:-translate-y-0.5',
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
].join(' ')

const HERO_TITLE = [
  { text: '高颜值的棋盘，' },
  { text: '全模型参战。', accent: true },
] as const

const HERO_HIGHLIGHTS = [
  `${GAMES.length} 款经典棋种`,
  '人类 / 算法 / LLM 同场',
  '统一规则协议',
  '纯静态 · 免登录',
] as const

export function HomePage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-14">
        <HeroSection
          eyebrow="STRATEGY GAME ARCADES / 策略游戏集锦"
          title={HERO_TITLE}
          description="以桌面质感重新打磨每一枚棋子与每一次落子。人类、启发式算法与任意大模型共用同一套规则协议——选一张棋盘，谁来执子由你决定。"
          highlights={HERO_HIGHLIGHTS}
        />
        <AuthorLinks />
        <section className="flex flex-col gap-6">
          <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">
                GAMES / 棋种
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">选择一个游戏</h2>
            </div>
            <p className="text-xs text-muted-foreground">{GAMES.length} 款 · 持续扩充</p>
          </header>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {GAMES.map((game) => {
              const Art = GAME_ART[game.id]
              return (
                <Link key={game.id} to={game.path} className={cardLinkClassName}>
                  <GameCard
                    {...game.toCardData()}
                    thumbnail={({ hovered }) => (
                      <GameThumbnail hovered={hovered}>
                        <Art />
                      </GameThumbnail>
                    )}
                  />
                </Link>
              )
            })}
          </div>
        </section>
      </main>
      <footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 pb-10">
        <BuildStamp />
        <p className="text-xs text-muted-foreground">策略游戏集锦 · Strategy Game Arcades</p>
      </footer>
    </>
  )
}