import { Button } from '@/components/ui/button'
import type { AiGameTestContext } from '@/presentation/match-setup/ai-test-context'
import {
  DEFAULT_AI_TIMEOUT_MS,
  type AiSeatConfig,
  type HttpDecideConfig,
  type LocalLlmConfig,
} from '@/presentation/match-setup/ai-config'
import type { SeatVerification } from '@/presentation/ai/seat-verification'
import { AiTestRunner } from './AiTestRunner'
import { ConfigField, ConfigTextField, CONFIG_INPUT_CLASS } from './ConfigField'
import { CredentialField } from './CredentialField'

export interface LocalSeatFormProps {
  readonly seatId: string
  readonly config: AiSeatConfig | undefined
  readonly onChange: (config: AiSeatConfig | undefined) => void
  readonly context: AiGameTestContext
  readonly verification: SeatVerification | undefined
  readonly onVerified: (verification: SeatVerification) => void
}

type LocalMode = 'local-llm' | 'http-decide'

const LOCAL_PRESETS = [
  {
    label: 'Ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'qwen2.5:7b',
    hint: '需先启动 ollama serve，并允许本站 Origin 的 CORS。',
  },
  {
    label: 'LM Studio',
    baseUrl: 'http://127.0.0.1:1234/v1',
    model: 'local-model',
    hint: '在 LM Studio 的本地服务器设置中开启 CORS。',
  },
] as const

const DECIDE_REQUEST_EXAMPLE = `POST /decide
{
  "protocolVersion": 1,
  "game": "gomoku",
  "observation": { "...": "公开局面" },
  "legalActions": [ { "type": "place", "row": 7, "col": 7 } ],
  "turn": 0,
  "playerId": "black"
}

200 OK
{ "action": { "type": "place", "row": 7, "col": 7 } }`

export function LocalSeatForm({
  seatId,
  config,
  onChange,
  context,
  verification,
  onVerified,
}: LocalSeatFormProps) {
  const mode: LocalMode = config?.kind === 'http-decide' ? 'http-decide' : 'local-llm'

  function switchMode(next: LocalMode) {
    onChange(
      next === 'http-decide'
        ? {
            kind: 'http-decide',
            endpoint: 'http://127.0.0.1:8787/decide',
            timeoutMs: DEFAULT_AI_TIMEOUT_MS,
            credentialId: null,
          }
        : localLlmDefault(),
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-2 sm:grid-cols-2">
        <ModeButton
          active={mode === 'local-llm'}
          label="localhost 大模型"
          hint="Ollama / LM Studio / 兼容 Chat Completions"
          onClick={() => switchMode('local-llm')}
        />
        <ModeButton
          active={mode === 'http-decide'}
          label="自定义 /decide"
          hint="你自己的本地决策服务"
          onClick={() => switchMode('http-decide')}
        />
      </div>

      <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
        棋局数据只发往你填写的本机地址，不经过本站服务器。浏览器必须先得到该服务的 CORS
        许可；本项目不会引导你关闭安全策略，也不建议使用全局
        <code className="mx-1 rounded bg-muted px-1">Access-Control-Allow-Origin: *</code>。
      </p>

      <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">导入模型文件（未开放）</p>
        <p className="mt-1">
          JSON 权重与 ONNX 需要与训练一致的特征编码、归一化、玩家视角和动作索引协议；
          在这些协议可验证之前，本项目不会提供导入入口，也不会把「文件加载成功」显示成可用。
        </p>
      </div>

      {mode === 'local-llm' ? (
        <LocalLlmFields
          current={config?.kind === 'local-llm' ? config : localLlmDefault()}
          onUpdate={(next) => onChange(next)}
          seatId={seatId}
          context={context}
          verification={verification}
          onVerified={onVerified}
        />
      ) : (
        <HttpDecideFields
          current={
            config?.kind === 'http-decide'
              ? config
              : {
                  kind: 'http-decide',
                  endpoint: '',
                  timeoutMs: DEFAULT_AI_TIMEOUT_MS,
                  credentialId: null,
                }
          }
          onUpdate={(next) => onChange(next)}
          seatId={seatId}
          context={context}
          verification={verification}
          onVerified={onVerified}
        />
      )}
    </div>
  )
}

function LocalLlmFields({
  current,
  onUpdate,
  seatId,
  context,
  verification,
  onVerified,
}: {
  readonly current: LocalLlmConfig
  readonly onUpdate: (next: LocalLlmConfig) => void
  readonly seatId: string
  readonly context: AiGameTestContext
  readonly verification: SeatVerification | undefined
  readonly onVerified: (verification: SeatVerification) => void
}) {
  function update(patch: Partial<LocalLlmConfig>) {
    onUpdate({ ...current, ...patch })
  }
  return (
    <div className="flex flex-col gap-5">
      <ConfigField label="快速预填" hint="只填地址示例；实际可用性取决于你本机的服务与 CORS 设置。">
        <div className="flex flex-wrap gap-2">
          {LOCAL_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onUpdate({
                  ...current,
                  baseUrl: preset.baseUrl,
                  model: current.model.trim() === '' ? preset.model : current.model,
                })
              }
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </ConfigField>

      <ConfigTextField
        label="服务基址"
        type="url"
        value={current.baseUrl}
        onChange={(baseUrl) => update({ baseUrl })}
        placeholder="http://127.0.0.1:11434/v1"
        hint="必须是监听 127.0.0.1 / localhost 的 OpenAI 兼容端点。"
      />
      <ConfigTextField
        label="模型 ID"
        value={current.model}
        onChange={(model) => update({ model })}
        placeholder="例如 qwen2.5:7b"
        hint="本地服务实际加载的模型名。"
      />
      <TimeoutField value={current.timeoutMs} onChange={(timeoutMs) => update({ timeoutMs })} />
      <CredentialField
        label="本地访问令牌"
        optional
        credentialId={current.credentialId}
        onChange={(credentialId) => update({ credentialId })}
        hint="多数本机服务不需要令牌；需要时作为 Bearer Token 发送。"
      />
      <AiTestRunner
        config={current}
        seatId={seatId}
        context={context}
        verification={verification}
        onVerified={onVerified}
        actionLabel="测试本地模型"
      />
    </div>
  )
}

function HttpDecideFields({
  current,
  onUpdate,
  seatId,
  context,
  verification,
  onVerified,
}: {
  readonly current: HttpDecideConfig
  readonly onUpdate: (next: HttpDecideConfig) => void
  readonly seatId: string
  readonly context: AiGameTestContext
  readonly verification: SeatVerification | undefined
  readonly onVerified: (verification: SeatVerification) => void
}) {
  function update(patch: Partial<HttpDecideConfig>) {
    onUpdate({ ...current, ...patch })
  }
  return (
    <div className="flex flex-col gap-5">
      <ConfigTextField
        label="决策端点"
        type="url"
        value={current.endpoint}
        onChange={(endpoint) => update({ endpoint })}
        placeholder="http://127.0.0.1:8787/decide"
        hint="填完整路径；客户端会向该 URL POST JSON。"
      />
      <TimeoutField value={current.timeoutMs} onChange={(timeoutMs) => update({ timeoutMs })} />
      <CredentialField
        label="本地服务令牌"
        optional
        credentialId={current.credentialId}
        onChange={(credentialId) => update({ credentialId })}
        hint="以 Authorization: Bearer <token> 发送；不需要时留空。"
      />
      <ConfigField label="协议示例" hint="响应只接受 { action }，且动作必须属于发送过去的 legalActions。">
        <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] text-muted-foreground">
          {DECIDE_REQUEST_EXAMPLE}
        </pre>
      </ConfigField>
      <AiTestRunner
        config={current}
        seatId={seatId}
        context={context}
        verification={verification}
        onVerified={onVerified}
        actionLabel="测试本地智能体"
      />
    </div>
  )
}

function TimeoutField({
  value,
  onChange,
}: {
  readonly value: number
  readonly onChange: (value: number) => void
}) {
  return (
    <ConfigField label="超时" hint="本地模型首次加载可能较慢；超时后本回合不会落子。">
      <div className="flex flex-wrap items-center gap-2">
        {[10_000, 30_000, 60_000, 120_000].map((ms) => (
          <Button
            key={ms}
            type="button"
            variant={value === ms ? 'default' : 'outline'}
            size="sm"
            aria-pressed={value === ms}
            onClick={() => onChange(ms)}
          >
            {ms / 1000}s
          </Button>
        ))}
        <input
          type="number"
          min={1000}
          max={120000}
          step={1000}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isFinite(next)) {
              onChange(Math.min(120_000, Math.max(1_000, next)))
            }
          }}
          className={`${CONFIG_INPUT_CLASS} w-28`}
        />
      </div>
    </ConfigField>
  )
}

function ModeButton({
  active,
  label,
  hint,
  onClick,
}: {
  readonly active: boolean
  readonly label: string
  readonly hint: string
  readonly onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        'flex flex-col gap-0.5 rounded-xl border p-3 text-left transition-colors',
        active
          ? 'border-secondary bg-secondary/10'
          : 'hover:bg-muted/40',
      ].join(' ')}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </button>
  )
}

function localLlmDefault(): LocalLlmConfig {
  return {
    kind: 'local-llm',
    baseUrl: '',
    model: '',
    timeoutMs: DEFAULT_AI_TIMEOUT_MS,
    credentialId: null,
  }
}