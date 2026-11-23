import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { AiGameTestContext } from '@/presentation/match-setup/ai-test-context'
import {
  DEFAULT_JAVASCRIPT_SOURCE,
  SCRIPT_TIMEOUT_MS,
  type AiSeatConfig,
  type JavaScriptStrategyConfig,
} from '@/presentation/match-setup/ai-config'
import type { SeatVerification } from '@/presentation/ai/seat-verification'
import {
  deleteStrategy,
  readStrategies,
  saveStrategy,
} from '@/presentation/ai/strategy-library'
import { AiTestRunner } from './AiTestRunner'
import { ConfigField, ConfigTextField } from './ConfigField'
import { StrategyEditor } from './StrategyEditor'

export interface AlgorithmSeatFormProps {
  readonly seatId: string
  readonly config: AiSeatConfig | undefined
  readonly onChange: (config: AiSeatConfig | undefined) => void
  readonly context: AiGameTestContext
  readonly verification: SeatVerification | undefined
  readonly onVerified: (verification: SeatVerification) => void
}

const ALGORITHM_MODES = [
  { kind: 'builtin', label: '内置算法', hint: '开箱即用，完全离线' },
  { kind: 'javascript', label: '编写策略', hint: 'JavaScript · 沙箱执行' },
] as const

const BUILTIN_FACTS = [
  { label: '决策方式', value: '启发式搜索' },
  { label: '网络依赖', value: '完全离线' },
  { label: '当前强度', value: '均衡（控制器默认值）' },
] as const

export function AlgorithmSeatForm({
  seatId,
  config,
  onChange,
  context,
  verification,
  onVerified,
}: AlgorithmSeatFormProps) {
  const mode = config?.kind === 'javascript' ? 'javascript' : 'builtin'
  const strategy = config?.kind === 'javascript' ? config : defaultStrategy()

  function switchMode(next: 'builtin' | 'javascript') {
    onChange(next === 'builtin' ? { kind: 'builtin' } : strategy)
  }

  function updateStrategy(patch: Partial<JavaScriptStrategyConfig>) {
    onChange({ ...strategy, ...patch })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-2 sm:grid-cols-2">
        {ALGORITHM_MODES.map((item) => (
          <button
            key={item.kind}
            type="button"
            aria-pressed={mode === item.kind}
            onClick={() => switchMode(item.kind)}
            className={[
              'flex flex-col gap-0.5 rounded-xl border p-3 text-left transition-colors',
              mode === item.kind
                ? 'border-[var(--color-green)] bg-[var(--color-green)]/5'
                : 'hover:bg-muted/40',
            ].join(' ')}
          >
            <span className="text-sm font-medium">{item.label}</span>
            <span className="text-xs text-muted-foreground">{item.hint}</span>
          </button>
        ))}
      </div>

      {mode === 'builtin' ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            该席位由游戏内置的启发式搜索驱动，无需额外配置即可开局。
          </p>
          <dl className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-3">
            {BUILTIN_FACTS.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                <dd className="text-sm font-medium">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
            策略在你的浏览器内由独立 QuickJS 解释器执行，不接触 DOM、网络、存储或 API
            Key。单步超时后 Worker 会被终止。
          </p>

          <ConfigField
            label="程序语言"
            hint="当前只启用 JavaScript；Lua / Python 需要各自的独立沙箱运行时，未完成前不开放。"
          >
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled>
                JavaScript
              </Button>
              <Button type="button" size="sm" variant="outline" disabled>
                Lua（未开放）
              </Button>
              <Button type="button" size="sm" variant="outline" disabled>
                Python（未开放）
              </Button>
            </div>
          </ConfigField>

          <ConfigTextField
            label="策略名称"
            value={strategy.name}
            onChange={(name) => updateStrategy({ name })}
            maxLength={80}
            hint="仅用于配置页识别，不参与决策。"
          />

          <ConfigField label="decide() 源码" hint="必须同步返回 legalActions 中的一个动作。">
            <StrategyEditor
              value={strategy.source}
              onChange={(source) => updateStrategy({ source })}
            />
          </ConfigField>

          <ConfigField label="单步超时" hint="毫秒；超时会终止本次执行，本回合不会落子。">
            <div className="flex flex-wrap items-center gap-2">
              {[500, 1000, 2000, 5000].map((ms) => (
                <Button
                  key={ms}
                  variant={strategy.timeoutMs === ms ? 'default' : 'outline'}
                  size="sm"
                  aria-pressed={strategy.timeoutMs === ms}
                  onClick={() => updateStrategy({ timeoutMs: ms })}
                >
                  {ms}ms
                </Button>
              ))}
            </div>
          </ConfigField>

          <StrategyFileActions
            strategy={strategy}
            onImport={(next) => updateStrategy(next)}
            onReset={() => updateStrategy({ source: DEFAULT_JAVASCRIPT_SOURCE })}
          />

          <StrategyLibrary
            gameId={context.gameId}
            strategy={strategy}
            onLoad={(next) => updateStrategy(next)}
          />

          <AiTestRunner
            config={strategy}
            seatId={seatId}
            context={context}
            verification={verification}
            onVerified={onVerified}
            actionLabel="测试策略"
          />
        </div>
      )}
    </div>
  )
}

function defaultStrategy(): JavaScriptStrategyConfig {
  return {
    kind: 'javascript',
    language: 'javascript',
    name: '我的策略',
    source: DEFAULT_JAVASCRIPT_SOURCE,
    timeoutMs: SCRIPT_TIMEOUT_MS,
  }
}

function StrategyLibrary({
  gameId,
  strategy,
  onLoad,
}: {
  readonly gameId: string
  readonly strategy: JavaScriptStrategyConfig
  readonly onLoad: (patch: Partial<JavaScriptStrategyConfig>) => void
}) {
  const [entries, setEntries] = useState(() => readStrategies(gameId))
  const [message, setMessage] = useState<string | null>(null)

  function refresh() {
    setEntries(readStrategies(gameId))
  }

  function save() {
    const entry = saveStrategy({
      gameId,
      name: strategy.name,
      source: strategy.source,
      timeoutMs: strategy.timeoutMs,
    })
    refresh()
    setMessage(`已保存「${entry.name}」。`)
  }

  function remove(id: string) {
    if (!window.confirm('删除这条已保存的策略？')) {
      return
    }
    deleteStrategy(id)
    refresh()
    setMessage(null)
  }

  return (
    <ConfigField
      label="本地策略库"
      hint="按游戏保存在浏览器 localStorage；只存源码，不会执行或上传。"
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={save}>
            保存当前策略
          </Button>
          {message !== null ? (
            <span className="text-xs text-muted-foreground">{message}</span>
          ) : null}
        </div>
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">这个游戏还没有保存过策略。</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2 text-xs"
              >
                <span className="font-medium">{entry.name}</span>
                <span className="text-muted-foreground">
                  {entry.timeoutMs}ms · {new Date(entry.updatedAt).toLocaleString()}
                </span>
                <span className="ml-auto flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onLoad({
                        name: entry.name,
                        source: entry.source,
                        timeoutMs: entry.timeoutMs,
                      })
                    }
                  >
                    加载
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => remove(entry.id)}
                  >
                    删除
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ConfigField>
  )
}

function StrategyFileActions({
  strategy,
  onImport,
  onReset,
}: {
  readonly strategy: JavaScriptStrategyConfig
  readonly onImport: (patch: Partial<JavaScriptStrategyConfig>) => void
  readonly onReset: () => void
}) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  function exportStrategy() {
    const payload = JSON.stringify(
      {
        format: 'strategy-game-arcades/javascript-strategy',
        version: 1,
        name: strategy.name,
        language: 'javascript',
        source: strategy.source,
        timeoutMs: strategy.timeoutMs,
      },
      null,
      2,
    )
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${strategy.name || 'strategy'}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importStrategy(file: File) {
    setError(null)
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('文件不是策略 JSON。')
      }
      const record = parsed as Record<string, unknown>
      if (record.format !== 'strategy-game-arcades/javascript-strategy') {
        throw new Error('不认识的文件格式。')
      }
      if (typeof record.source !== 'string') {
        throw new Error('缺少 source。')
      }
      onImport({
        name: typeof record.name === 'string' ? record.name.slice(0, 80) : '导入的策略',
        source: record.source,
        timeoutMs: typeof record.timeoutMs === 'number' ? record.timeoutMs : SCRIPT_TIMEOUT_MS,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file !== undefined) {
            void importStrategy(file)
          }
        }}
      />
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
        导入策略
      </Button>
      <Button variant="outline" size="sm" onClick={exportStrategy}>
        导出策略
      </Button>
      <Button variant="outline" size="sm" onClick={onReset}>
        恢复模板
      </Button>
      <span className="text-xs text-muted-foreground">
        策略随本局配置保存在浏览器本地；换游戏时请重新导入。
      </span>
      {error !== null ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  )
}