export const THEME_MODES = ['light', 'dark'] as const

export type ThemeMode = (typeof THEME_MODES)[number]

/** 主题偏好只存用户本地，与存档、账号无关。 */
export const THEME_STORAGE_KEY = 'table.theme'

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

export function readStoredTheme(): ThemeMode | null {
  const value = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemeMode(value) ? value : null
}

export function resolveInitialTheme(): ThemeMode {
  const stored = readStoredTheme()
  if (stored !== null) return stored

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode
}

export function persistTheme(mode: ThemeMode): void {
  window.localStorage.setItem(THEME_STORAGE_KEY, mode)
}