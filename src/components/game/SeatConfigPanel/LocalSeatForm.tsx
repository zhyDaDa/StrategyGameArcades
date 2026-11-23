import { AiProfilePicker } from '@/components/ai/AiProfilePicker'
import type { AiGameTestContext } from '@/presentation/match-setup/ai-test-context'
import type { AiSeatConfig } from '@/presentation/match-setup/ai-config'
import { profileToSeatConfig } from '@/presentation/ai/profiles'
import type { SeatVerification } from '@/presentation/ai/seat-verification'
import { AiTestRunner } from './AiTestRunner'

export interface LocalSeatFormProps {
  readonly seatId: string
  readonly config: AiSeatConfig | undefined
  readonly onChange: (config: AiSeatConfig | undefined) => void
  readonly context: AiGameTestContext
  readonly verification: SeatVerification | undefined
  readonly onVerified: (verification: SeatVerification) => void
}

/**
 * 小模型席位：同样只从设置页保存的配置中选择。
 * 配置可以是 localhost 大模型（Ollama / LM Studio），也可以是自定义 /decide 服务。
 */
export function LocalSeatForm({
  seatId,
  config,
  onChange,
  context,
  verification,
  onVerified,
}: LocalSeatFormProps) {
  const selected =
    config?.kind === 'local-llm' && config.endpoint.trim() !== '' && config.model.trim() !== ''
      ? config
      : config?.kind === 'http-decide' && config.endpoint.trim() !== ''
        ? config
        : null

  return (
    <div className="flex flex-col gap-6">
      <AiProfilePicker
        kinds={['local-llm', 'http-decide']}
        current={config}
        onSelect={(profile) => onChange(profileToSeatConfig(profile))}
      />

      <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
        棋局数据只发往所选配置中的本机地址，不经过本站服务器。浏览器必须先得到该服务的
        CORS 许可；本项目不会引导你关闭安全策略。配置的地址、模型与令牌都在
        「设置 → AI 配置」中维护。
      </p>

      {selected !== null ? (
        <AiTestRunner
          config={selected}
          seatId={seatId}
          context={context}
          verification={verification}
          onVerified={onVerified}
          actionLabel="测试本地接入"
        />
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          先在设置页保存一个 localhost 模型或自定义 /decide 配置，再回到这里选择并测试。
        </p>
      )}
    </div>
  )
}