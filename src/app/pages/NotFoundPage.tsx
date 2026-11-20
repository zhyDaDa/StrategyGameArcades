import { Link } from '@/routers/Link'
import { ROUTE_PATHS } from '@/routers/paths'

export function NotFoundPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6">
      <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">404 / NOT FOUND</p>
      <h1 className="text-3xl font-semibold tracking-tight">页面不存在</h1>
      <p className="text-sm text-muted-foreground">你访问的路径没有对应的页面。</p>
      <Link to={ROUTE_PATHS.home} className="w-fit text-sm underline underline-offset-4">
        返回首页
      </Link>
    </main>
  )
}