import { Button } from '@/components/ui/button'
import { THEME_MODES, useTheme, type ThemeMode } from '@/presentation/theme'

const THEME_LABELS: Record<ThemeMode, string> = {
  light: '浅色',
  dark: '深色',
}

export function SettingsPage() {
  const { mode, setTheme } = useTheme()

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
    </main>
  )
}