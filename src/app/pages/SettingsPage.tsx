import { useCallback, useReducer, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { credentialStore } from '@/presentation/ai/credential-store'
import { clearAllStrategies, countStrategies } from '@/presentation/ai/strategy-library'
import { THEME_MODES, useTheme, type ThemeMode } from '@/presentation/theme'

const THEME_LABELS: Record<ThemeMode, string> = {
  light: '浅色',
  dark: '深色',
}

export function SettingsPage() {
  const { mode, setTheme } = useTheme()
  const subscribe = useCallback((listener: () => void) => credentialStore.subscribe(listener), [])
  const snapshot = useCallback(() => credentialStore.getSnapshotVersion(), [])
  useSyncExternalStore(subscribe, snapshot, snapshot)
  const [, refreshStrategies] = useReducer((value: number) => value + 1, 0)
  const credentials = credentialStore.list()
  const remembered = credentials.filter((entry) => entry.remembered).length
  const strategyCount = countStrategies()

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-3 border-b pb-8">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">
          SETTINGS / 设置
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">设置</h1>
        <p className="text-sm text-muted-foreground">
          外观偏好只保存在当前浏览器，不会上传到任何服务。
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold tracking-tight">外观</h2>
          <p className="text-sm text-muted-foreground">全站统一配色，可随时切换。</p>
        </div>
        <div className="flex gap-2">
          {THEME_MODES.map((value) => (
            <Button
              key={value}
              variant={mode === value ? 'default' : 'outline'}
              aria-pressed={mode === value}
              onClick={() => setTheme(value)}
            >
              {THEME_LABELS[value]}
            </Button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold tracking-tight">AI 凭据</h2>
          <p className="text-sm text-muted-foreground">
            当前有 {credentials.length} 个凭据在本次会话中，其中 {remembered} 个选择了记住到本机。
            「记住」会把 Key 明文写入 localStorage，任何同源脚本都能读取；没有任何加密收益。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={credentials.length === 0}
            onClick={() => {
              if (window.confirm('清空全部 AI 凭据？引用这些凭据的席位将无法行动，直到重新配置。')) {
                credentialStore.clearAll()
              }
            }}
          >
            清空全部 AI 凭据
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          对局配置里只保存凭据 id，不保存 Key。清空后，引用这些凭据的 AI 席位会在行动时报错，
          需要回到该局配置页重新填写。本站没有后端，也不会把 Key 发送到本站服务器。
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold tracking-tight">本地策略库</h2>
          <p className="text-sm text-muted-foreground">
            当前保存了 {strategyCount} 条 JavaScript 策略，只在本机 localStorage 中。
          </p>
        </div>
        <div>
          <Button
            variant="outline"
            disabled={strategyCount === 0}
            onClick={() => {
              if (window.confirm('清空本地策略库？此操作不可撤销。')) {
                clearAllStrategies()
                refreshStrategies()
              }
            }}
          >
            清空本地策略库
          </Button>
        </div>
      </section>
    </main>
  )
}