export interface DraftNoticeProps {
  readonly children: string
}

/** 尚未接通对局的接入方式统一标记为草稿，避免被误认为已可用于实战。 */
export function DraftNotice({ children }: DraftNoticeProps) {
  return (
    <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
      <span className="mr-2 rounded border px-1.5 py-0.5 text-[10px]">草稿</span>
      {children}
    </p>
  )
}