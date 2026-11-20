import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ThemeContext,
  applyTheme,
  persistTheme,
  resolveInitialTheme,
  type ThemeMode,
} from '@/presentation/theme'

export interface ThemeProviderProps {
  readonly children: ReactNode
}

/**
 * 全站主题的唯一持有者：
 * 初始值来自本地偏好（缺省跟随系统），切换时写入 <html data-theme> 并持久化。
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(resolveInitialTheme)

  useLayoutEffect(() => {
    applyTheme(mode)
  }, [mode])

  const setTheme = useCallback((next: ThemeMode) => {
    setMode(next)
    persistTheme(next)
  }, [])

  const toggle = useCallback(() => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    persistTheme(next)
  }, [mode])

  const value = useMemo(
    () => ({ mode, setTheme, toggle }),
    [mode, setTheme, toggle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}