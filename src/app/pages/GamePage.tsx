import { GAMES } from '@/games/registry'
import { Link } from '@/routers/Link'
import { ROUTE_PATHS } from '@/routers/paths'
import { useRouter } from '@/routers/useRouter'

/**
 * 游戏详情页骨架：只负责取路由参数、选定游戏并组织页面。
 * 棋盘与对局交互属于后续阶段，这里不放任何规则逻辑。
 */
export function GamePage() {
  const { match } = useRouter()
  const gameId = match?.params.gameId
  const game = gameId === undefined ? undefined : GAMES.find((item) => item.id === gameId)

  if (game === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">GAME / 未知游戏</p>
        <h1 className="text-3xl font-semibold tracking-tight">没有这个游戏</h1>
        <p className="text-sm text-muted-foreground">
          路径 <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/games/{gameId ?? ''}</code>{' '}
          不在游戏注册表中。
        </p>
        <Link to={ROUTE_PATHS.home} className="w-fit text-sm underline underline-offset-4">
          返回首页
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3 border-b pb-8">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">
          TABLE / 桌游实验室
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{game.name}</h1>
        <p className="text-sm text-muted-foreground">{game.description}</p>
      </header>

      <section className="flex flex-col gap-2 rounded-xl border border-dashed p-10 text-sm text-muted-foreground">
        <p>{game.name} 的棋盘与对局界面将在后续阶段接入。</p>
        <p>当前路由已生效：{game.path}</p>
      </section>

      <Link to={ROUTE_PATHS.home} className="w-fit text-sm underline underline-offset-4">
        返回首页
      </Link>
    </main>
  )
}