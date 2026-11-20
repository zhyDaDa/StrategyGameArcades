import { MotionConfig } from 'motion/react'
import { RouterProvider } from '@/routers'
import { ROUTES } from './routes'

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <RouterProvider routes={ROUTES} fallbackRouteId="notFound" />
    </MotionConfig>
  )
}