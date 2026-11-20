import { Moon, Sun } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { motionTokens } from '@/presentation/motion/tokens'
import { useTheme } from '@/presentation/theme'

export function ThemeToggle() {
  const { mode, toggle } = useTheme()
  const label = mode === 'dark' ? '切换到浅色主题' : '切换到深色主题'

  return (
    <Button variant="ghost" size="icon" aria-label={label} title={label} onClick={toggle}>
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={mode}
          initial={{ opacity: 0, rotate: -60, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 60, scale: 0.8 }}
          transition={{ duration: motionTokens.duration.quick }}
          className="flex items-center justify-center"
        >
          {mode === 'dark' ? <Sun /> : <Moon />}
        </motion.span>
      </AnimatePresence>
    </Button>
  )
}