import { Ellipsis, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROUTE_PATHS, useRouter } from '@/routers'

/** 顶部「更多」菜单：站内导航入口集中在这里，所有页面都能进入设置。 */
export function NavMenu() {
  const { navigate } = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="更多">
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onSelect={() => navigate(ROUTE_PATHS.settings)}>
          <Settings />
          设置
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}