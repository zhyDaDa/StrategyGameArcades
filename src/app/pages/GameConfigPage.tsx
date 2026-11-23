import { useState } from 'react'
import { GAME_VIEWS } from '@/app/game-views/registry'
import { saveStoredMatch, type MatchStartPayload } from '@/app/match-storage'
import { GAMES } from '@/games/registry'
import { Link, gamePath, useRouter } from '@/routers'

/**
 * 通用配置路由页：取 gameId、找到游戏专属配置视图，
 * 开始游戏时把「配置 + 初始快照」写入 localStorage，再进入对局页。
 * 标题区作为 header 交给配置视图，使其与配置内容一起参与整页翻页。
 */
export function GameConfigPage() {
  const { match, navigate } = useRouter()
  const [startError, setStartError] = useState<string | null>(null)
  const gameId = match?.params.gameId
  const game = gameId === undefined ? undefined : GAMES.find((item) => item.id === gameId)

  if (game === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">GAME / 未知游戏</p>
        <h1 className="text-3xl font-semibold tracking-tight">没有这个游戏</h1>
        <p className="text-sm text-muted-foreground">
          路径 <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/config/{gameId ?? ''}</code>{' '}
          不在游戏注册表中。
        </p>
      </main>
    )
  }

  const currentGame = game
  const ConfigView = GAME_VIEWS[currentGame.id]?.Config

  function handleStart(payload: MatchStartPayload) {
    try {
      saveStoredMatch(currentGame.id, payload)
      setStartError(null)
      navigate(gamePath(currentGame.id))
    } catch (err) {
      setStartError(err instanceof Error ? err.message : String(err))
    }
  }

  const header = (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 border-b pb-8">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">
          GAME / 对局配置
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{currentGame.name}</h1>
        <p className="text-sm text-muted-foreground">{currentGame.description}</p>
      </header>

      {startError !== null ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          无法保存本局配置：{startError}
        </p>
      ) : null}
    </div>
  )

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
      {ConfigView === undefined ? (
        <>
          {header}
          <section className="flex flex-col gap-3 rounded-xl border border-dashed p-10 text-sm text-muted-foreground">
            <p>{currentGame.name} 的配置页尚未接入。</p>
            <Link to={gamePath(currentGame.id)} className="w-fit underline underline-offset-4">
              进入游戏页
            </Link>
          </section>
        </>
      ) : (
        <ConfigView header={header} onStart={handleStart} />
      )}
    </main>
  )
}