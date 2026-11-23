import { ConfigTextField } from './ConfigField'
import { DraftNotice } from './DraftNotice'
import type { SeatDraft } from './seat-draft'

export interface LlmSeatFormProps {
  readonly draft: SeatDraft
  readonly onDraftChange: (patch: Partial<SeatDraft>) => void
}

/** 大模型席位：先保留端点 / 模型 / Key 的配置位，控制器接通前不参与对局。 */
export function LlmSeatForm({ draft, onDraftChange }: LlmSeatFormProps) {
  return (
    <div className="flex flex-col gap-6">
      <DraftNotice>
        大模型接入尚未接通。下面的配置只保存在本次配置会话中，暂不写入对局；接通后首版将使用你自带的 Key 直连兼容端点。
      </DraftNotice>

      <div className="flex flex-col gap-5">
        <ConfigTextField
          label="接口端点"
          type="url"
          value={draft.llmEndpoint}
          onChange={(llmEndpoint) => onDraftChange({ llmEndpoint })}
          placeholder="https://api.example.com/v1/chat/completions"
          hint="兼容 OpenAI Chat Completions 的端点。"
        />
        <ConfigTextField
          label="模型"
          value={draft.llmModel}
          onChange={(llmModel) => onDraftChange({ llmModel })}
          placeholder="例如：claude-sonnet-5-5"
          hint="模型名称由端点提供方决定。"
        />
        <ConfigTextField
          label="API Key"
          type="password"
          value={draft.llmApiKey}
          onChange={(llmApiKey) => onDraftChange({ llmApiKey })}
          placeholder="仅保存在本地浏览器内存"
          hint="Key 不会写入静态构建产物。"
        />
      </div>
    </div>
  )
}