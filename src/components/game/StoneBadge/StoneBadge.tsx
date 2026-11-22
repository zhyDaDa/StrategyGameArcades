export interface StoneBadgeProps {
  readonly side: 'black' | 'white'
  readonly className?: string
}

/** 黑白棋子的通用徽章：五子棋、围棋、黑白棋的配置页共用。 */
export function StoneBadge({ side, className }: StoneBadgeProps) {
  return (
    <span
      aria-hidden="true"
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-md border bg-muted/40',
        className ?? 'size-10',
      ].join(' ')}
    >
      <span
        className={[
          'h-1/2 w-1/2 rounded-full',
          side === 'black' ? 'bg-zinc-900' : 'bg-zinc-50 ring-1 ring-border',
        ].join(' ')}
      />
    </span>
  )
}