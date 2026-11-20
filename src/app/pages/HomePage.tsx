import { GameCard } from '@/components/game/GameCard/GameCard'
import { GAMES } from '@/games/registry'
import { Link } from '@/routers/Link'

const cardLinkClassName = [
  'block rounded-xl outline-none transition-transform',
  'motion-safe:hover:-translate-y-0.5',
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
].join(' ')

export function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3 border-b pb-8">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">
          TABLE / 桌游实验室
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">选择一个游戏</h1>
        <p className="text-sm text-muted-foreground">
          人类、随机算法与 LLM 共用同一套规则协议。
        </p>
      </header>
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {GAMES.map((game) => (
          <Link key={game.id} to={game.path} className={cardLinkClassName}>
            <GameCard {...game.toCardData()} />
          </Link>
        ))}
      </section>
    </main>
  )
}