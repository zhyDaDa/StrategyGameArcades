import { AiProfilePicker } from '@/components/ai/AiProfilePicker'
import type { AiGameTestContext } from '@/presentation/match-setup/ai-test-context'
import type { AiSeatConfig } from '@/presentation/match-setup/ai-config'
import { profileToSeatConfig } from '@/presentation/ai/profiles'
import type { SeatVerification } from '@/presentation/ai/seat-verification'
import { AiTestRunner } from './AiTestRunner'

export interface LlmSeatFormProps {
  readonly seatId: string
  readonly config: AiSeatConfig | undefined
  readonly onChange: (config: AiSeatConfig | undefined) => void
  readonly context: AiGameTestContext
  readonly verification: SeatVerification | undefined
  readonly onVerified: (verification: SeatVerification) => void
}

/**
 * 大模型席位：只从设置页保存的配置中选择，并在此测试真实决策。
 * 地址、模型、Key 等编辑全部集中在「设置 → AI 配置」，这里不再提供临时输入。
 */
export function LlmSeatForm({
  seatId,
  config,
  onChange,
  context,
  verification,
  onVerified,
}: LlmSeatFormProps) {
  const selected =
    config?.kind === 'cloud-llm' &&
    config.endpoint.trim() !== '' &&
    config.model.trim() !== ''
      ? config
      : null

  return (
    <div className="flex flex-col gap-6">
      <AiProfilePicker
        kinds={['cloud-llm']}
        current={config}
        onSelect={(profile) => onChange(profileToSeatConfig(profile))}
      />

      <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
        本站没有后端。请求从你的浏览器直接发往所选配置中的完整地址；棋局公开数据与
        API Key 会发送给该服务商。配置与 Key 的管理、删除都在「设置 → AI 配置」。
      </p>

      {selected !== null ? (
        <AiTestRunner
          config={selected}
          seatId={seatId}
          context={context}
          verification={verification}
          onVerified={onVerified}
          actionLabel="测试连接并决策"
        />
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          先在设置页保存一个云端模型配置，再回到这里选择并测试。
        </p>
      )}
    </div>
  )
}