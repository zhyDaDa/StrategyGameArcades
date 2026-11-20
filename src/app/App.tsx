import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { RouterProvider, type RouteMatch } from '@/routers'
import { ROUTES } from './routes'
import { AppShell } from './shell/AppShell'

function renderLayout(page: ReactNode, match: RouteMatch) {
  return <AppShell match={match}>{page}</AppShell>
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <RouterProvider
          routes={ROUTES}
          fallbackRouteId="notFound"
          renderLayout={renderLayout}
        />
      </ThemeProvider>
    </MotionConfig>
  )
}