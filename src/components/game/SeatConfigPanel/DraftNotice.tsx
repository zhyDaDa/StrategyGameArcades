export interface DraftNoticeProps {
  readonly children: string
}

/** 尚未接通对局的接入方式统一说明，避免被误认为已可用于实战。 */
export function DraftNotice({ children }: DraftNoticeProps) {
  return (
    <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
      {children}
    </p>
  )
}