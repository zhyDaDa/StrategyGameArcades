import { useContext } from 'react'
import { ThemeContext, type ThemeContextValue } from './ThemeContext'

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)

  if (value === null) {
    throw new Error('useTheme 必须在 ThemeProvider 内使用')
  }

  return value
}