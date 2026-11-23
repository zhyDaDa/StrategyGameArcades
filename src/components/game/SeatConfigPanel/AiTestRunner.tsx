import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { AiGameTestContext } from '@/presentation/match-setup/ai-test-context'
import {
  aiConfigFingerprint,
  type AiSeatConfig,
} from '@/presentation/match-setup/ai-config'
import type { SeatTestResult } from '@/presentation/ai/test-seat'
import { testAiSeat } from '@/presentation/ai/test-seat'
import type { SeatVerification } from '@/presentation/ai/seat-verification'

export interface AiTestRunnerProps {
  readonly config: AiSeatConfig
  readonly seatId: string
  readonly context: AiGameTestContext
  readonly verification: SeatVerification | undefined
  readonly onVerified: (verification: SeatVerification) => void
  readonly actionLabel: string
}

/**
 * 配置页的真实接入测试：发送一次真实决策，只有返回合法动作才算成功。
 * 配置指纹变化后旧测试结果立即失效，开局按钮会重新锁上。
 */
export function AiTestRunner({
  config,
  seatId,
  context,
  verification,
  onVerified,
  actionLabel,
}: AiTestRunnerProps) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<SeatTestResult | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fingerprint = useMemo(() => aiConfigFingerprint(config), [config])
  const verifiedNow = verification?.fingerprint === fingerprint
  const stale = verification !== undefined && !verifiedNow

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  async function run() {
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort
    setRunning(true)
    setResult(null)
    try {
      const next = await testAiSeat(config, seatId, context, abort.signal)
      if (abort.signal.aborted) {
        return
      }
      setResult(next)
      if (next.ok) {
        onVerified({
          fingerprint,
          summary: next.summary,
          at: Date.now(),
        })
      }
    } finally {
      if (!abort.signal.aborted) {
        setRunning(false)
      }
    }
  }

  function cancel() {
    abortRef.current?.abort()
    setRunning(false)
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">接入测试</span>
          <span className="text-xs text-muted-foreground">
            使用真实样例局面执行一次决策，返回合法动作才算通过。
          </span>
        </div>
        <div className="flex items-center gap-2">
          {running ? (
            <Button variant="outline" size="sm" onClick={cancel}>
              取消
            </Button>
          ) : null}
          <Button size="sm" onClick={() => void run()} disabled={running}>
            {running ? '测试中…' : actionLabel}
          </Button>
        </div>
      </div>

      {verifiedNow ? (
        <p className="rounded-lg border border-[var(--color-green)]/40 bg-[var(--color-green)]/10 p-2.5 text-xs text-[var(--color-green)]">
          已通过测试：{verification.summary}
        </p>
      ) : stale ? (
        <p className="rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 p-2.5 text-xs text-[var(--color-primary)]">
          配置已修改，之前通过的测试已失效，需要重新测试。
        </p>
      ) : (
        <p className="rounded-lg border border-dashed p-2.5 text-xs text-muted-foreground">
          尚未测试。未通过测试的席位无法开局。
        </p>
      )}

      {result !== null ? <TestResultCard result={result} /> : null}

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none">查看测试局面与合法动作示例</summary>
        <div className="mt-2 flex flex-col gap-2">
          <p>策略或服务必须返回下方 legalActions 中的一个动作（JSON 结构完全一致）。</p>
          <SamplePosition seatId={seatId} context={context} />
        </div>
      </details>
    </div>
  )
}

function TestResultCard({ result }: { readonly result: SeatTestResult }) {
  if (result.ok) {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-[var(--color-green)]/40 bg-[var(--color-green)]/5 p-3 text-xs">
        <p className="font-medium text-[var(--color-green)]">
          测试通过 · {result.latencyMs}ms
        </p>
        <p className="break-all text-muted-foreground">{result.summary}</p>
        {result.logs.length > 0 ? <LogList logs={result.logs} /> : null}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs">
      <p className="font-medium text-destructive">{result.title}</p>
      <p className="text-muted-foreground">{result.hint}</p>
      {result.detail !== null ? (
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-background/70 p-2 font-mono text-[11px] text-muted-foreground">
          {result.detail}
        </pre>
      ) : null}
      {result.logs.length > 0 ? <LogList logs={result.logs} /> : null}
    </div>
  )
}

function LogList({ logs }: { readonly logs: readonly string[] }) {
  return (
    <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-background/70 p-2 font-mono text-[11px] text-muted-foreground">
      {logs.join('\n')}
    </pre>
  )
}

function SamplePosition({
  seatId,
  context,
}: {
  readonly seatId: string
  readonly context: AiGameTestContext
}) {
  const position = useMemo(() => context.createPosition(seatId), [context, seatId])
  const observation = JSON.stringify(position.observation, null, 2)
  const actions = position.legalActions
  const actionPreview = JSON.stringify(actions.slice(0, 8), null, 2)
  return (
    <div className="flex flex-col gap-2">
      <p>
        当前轮到 <code className="rounded bg-muted px-1">{position.playerId}</code>；
        合法动作共 {actions.length} 个。
      </p>
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded bg-background/70 p-2 font-mono text-[11px]">
        {observation.length > 4000 ? `${observation.slice(0, 4000)}\n…` : observation}
      </pre>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-background/70 p-2 font-mono text-[11px]">
        {actionPreview}
        {actions.length > 8 ? '\n…' : ''}
      </pre>
    </div>
  )
}