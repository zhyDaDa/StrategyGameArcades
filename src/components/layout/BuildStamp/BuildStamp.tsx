const BUILD_TIME_ZONE = 'Asia/Shanghai'

const buildTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUILD_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function formatBuildTime(iso: string): string {
  const parts = buildTimeFormatter.formatToParts(new Date(iso))
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')} ${value('hour')}:${value('minute')}`
}

/** 展示本次构建时间，用于确认线上版本是否已更新。 */
export function BuildStamp() {
  return (
    <p className="text-xs text-muted-foreground">
      最后构建 ·{' '}
      <time dateTime={__BUILD_TIME__}>{formatBuildTime(__BUILD_TIME__)}</time>
    </p>
  )
}