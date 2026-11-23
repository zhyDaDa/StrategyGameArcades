import { Button } from '@/components/ui/button'
import type { AiGameTestContext } from '@/presentation/match-setup/ai-test-context'
import {
  DEFAULT_AI_TIMEOUT_MS,
  LLM_PROVIDER_KINDS,
  type AiSeatConfig,
  type CloudLlmConfig,
  type LlmProviderKind,
} from '@/presentation/match-setup/ai-config'
import type { SeatVerification } from '@/presentation/ai/seat-verification'
import { AiTestRunner } from './AiTestRunner'
import { ConfigField, ConfigTextField, CONFIG_INPUT_CLASS } from './ConfigField'
import { CredentialField } from './CredentialField'

export interface LlmSeatFormProps {
  readonly seatId: string
  readonly config: AiSeatConfig | undefined
  readonly onChange: (config: AiSeatConfig | undefined) => void
  readonly context: AiGameTestContext
  readonly verification: SeatVerification | undefined
  readonly onVerified: (verification: SeatVerification) => void
}

const PROVIDER_LABELS: Record<LlmProviderKind, { label: string; hint: string; preset: string; model: string }> = {
  'openai-compatible': {
    label: 'OpenAI 兼容',
    hint: 'Chat Completions 协议',
    preset: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
  },
  anthropic: {
    label: 'Anthropic',
    hint: 'Messages API · 需浏览器直连权限',
    preset: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-5-5',
  },
}

/** 云端大模型 BYOK：密钥只经浏览器直连用户选择的服务商。 */
export function LlmSeatForm({
  seatId,
  config,
  onChange,
  context,
  verification,
  onVerified,
}: LlmSeatFormProps) {
  const current: CloudLlmConfig =
    config?.kind === 'cloud-llm'
      ? config
      : {
          kind: 'cloud-llm',
          provider: 'openai-compatible',
          baseUrl: '',
          model: '',
          timeoutMs: DEFAULT_AI_TIMEOUT_MS,
          credentialId: null,
        }

  function update(patch: Partial<CloudLlmConfig>) {
    onChange({ ...current, ...patch })
  }

  function switchProvider(provider: LlmProviderKind) {
    if (provider === current.provider) {
      return
    }
    const preset = PROVIDER_LABELS[provider]
    update({
      provider,
      baseUrl: current.baseUrl.trim() === '' ? preset.preset : current.baseUrl,
      model: current.model.trim() === '' ? preset.model : current.model,
      // 不同厂商的 Key 通常不通用；切换协议时要求重新填写，避免把旧 Key 发错地址。
      credentialId: null,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
        本站没有后端。请求从你的浏览器直接发往下面填写的服务商；棋局公开数据与 API Key
        会发送给该服务商。Key 默认只在本页内存中，可显式选择记住到本机。
      </p>

      <ConfigField label="接口类型" hint="只支持这两种请求协议，不猜测其它厂商的私有格式。">
        <div className="grid gap-2 sm:grid-cols-2">
          {LLM_PROVIDER_KINDS.map((provider) => {
            const meta = PROVIDER_LABELS[provider]
            return (
              <Button
                key={provider}
                type="button"
                variant={current.provider === provider ? 'default' : 'outline'}
                aria-pressed={current.provider === provider}
                onClick={() => switchProvider(provider)}
                className="h-auto flex-col items-start gap-0.5 py-2"
              >
                <span>{meta.label}</span>
                <span className="text-[11px] opacity-70">{meta.hint}</span>
              </Button>
            )
          })}
        </div>
      </ConfigField>

      <ConfigTextField
        label="接口基址"
        type="url"
        value={current.baseUrl}
        onChange={(baseUrl) => update({ baseUrl })}
        placeholder={PROVIDER_LABELS[current.provider].preset}
        hint="填服务基址（例如 https://api.openai.com/v1）；适配器会追加协议路径。"
      />
      <ConfigTextField
        label="模型 ID"
        value={current.model}
        onChange={(model) => update({ model })}
        placeholder={PROVIDER_LABELS[current.provider].model}
        hint="由服务商决定，本站不内置模型列表。"
      />

      <ConfigField label="超时" hint="单位毫秒；超时会取消本次请求，本回合不会落子。">
        <div className="flex flex-wrap items-center gap-2">
          {[15_000, 30_000, 60_000, 120_000].map((ms) => (
            <Button
              key={ms}
              type="button"
              variant={current.timeoutMs === ms ? 'default' : 'outline'}
              size="sm"
              aria-pressed={current.timeoutMs === ms}
              onClick={() => update({ timeoutMs: ms })}
            >
              {ms / 1000}s
            </Button>
          ))}
          <input
            type="number"
            min={1000}
            max={120000}
            step={1000}
            value={current.timeoutMs}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (Number.isFinite(value)) {
                update({ timeoutMs: Math.min(120_000, Math.max(1_000, value)) })
              }
            }}
            className={`${CONFIG_INPUT_CLASS} w-28`}
          />
        </div>
      </ConfigField>

      <CredentialField
        label="API Key"
        credentialId={current.credentialId}
        onChange={(credentialId) => update({ credentialId })}
        hint={
          current.provider === 'anthropic'
            ? 'Anthropic 浏览器直连需要其 CORS 支持；若被拒绝会显示 403 / 网络错误。'
            : 'Key 不会进入静态构建产物，也不会发送给本站服务器。'
        }
      />

      <AiTestRunner
        config={current}
        seatId={seatId}
        context={context}
        verification={verification}
        onVerified={onVerified}
        actionLabel="测试连接并决策"
      />
    </div>
  )
}