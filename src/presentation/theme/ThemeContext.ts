import { createContext } from 'react'
import type { ThemeMode } from './theme'

export interface ThemeContextValue {
  readonly mode: ThemeMode
  readonly setTheme: (mode: ThemeMode) => void
  readonly toggle: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)