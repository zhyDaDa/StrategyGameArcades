import { useContext } from 'react'
import { RouterContext } from './RouterContext'
import type { RouterContextValue } from './types'

/** 页面读取当前匹配与 phase；只能在 RouterProvider 内部调用。 */
export function useRouter(): RouterContextValue {
  const value = useContext(RouterContext)
  if (value === null) {
    throw new Error('useRouter() 必须在 <RouterProvider> 内使用')
  }
  return value
}