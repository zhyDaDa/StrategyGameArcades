const ALGORITHM_FACTS = [
  { label: '决策方式', value: '启发式搜索' },
  { label: '网络依赖', value: '完全离线' },
  { label: '当前强度', value: '均衡（控制器默认值）' },
] as const

/** 算法席位：内置启发式控制器已经可用，这里只展示它的运行事实。 */
export function AlgorithmSeatForm() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        该席位由游戏内置的启发式搜索驱动，无需额外配置即可开局。
      </p>
      <dl className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-3">
        {ALGORITHM_FACTS.map((fact) => (
          <div key={fact.label} className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{fact.label}</dt>
            <dd className="text-sm font-medium">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}