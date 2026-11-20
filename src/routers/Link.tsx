import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { useRouter } from './useRouter'

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  readonly to: string
}

/**
 * 站内链接：保留 <a> 的原生语义（新标签页、右键、外链、修饰键点击都照常），
 * 只有在普通左键点击站内路径时才交给路由器，由遮罩动画接管切换。
 */
export function Link({ to, onClick, target, ...rest }: LinkProps) {
  const { navigate } = useRouter()

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)

    if (event.defaultPrevented) return
    if (event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (target !== undefined && target !== '_self') return
    if (!to.startsWith('/')) return

    event.preventDefault()
    navigate(to)
  }

  return <a href={to} target={target} onClick={handleClick} {...rest} />
}