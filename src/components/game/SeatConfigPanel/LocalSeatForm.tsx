import { Button } from '@/components/ui/button'
import { ConfigField, ConfigTextField } from './ConfigField'
import { DraftNotice } from './DraftNotice'
import { LOCAL_DEVICES, LOCAL_DEVICE_LABELS, type SeatDraft } from './seat-draft'

export interface LocalSeatFormProps {
  readonly draft: SeatDraft
  readonly onDraftChange: (patch: Partial<SeatDraft>) => void
}

/** 小模型席位：保留模型路径与运行设备的配置位，控制器接通前不参与对局。 */
export function LocalSeatForm({ draft, onDraftChange }: LocalSeatFormProps) {
  return (
    <div className="flex flex-col gap-6">
      <DraftNotice>
        本地小模型接入尚未接通。下面的配置只保存在本次配置会话中，暂不写入对局。
      </DraftNotice>

      <ConfigTextField
        label="模型路径"
        value={draft.localModelPath}
        onChange={(localModelPath) => onDraftChange({ localModelPath })}
        placeholder="例如：./models/mini-chess.gguf"
        hint="本地权重文件或已安装模型的标识。"
      />

      <ConfigField label="运行设备" hint="选择推理时使用的硬件。">
        <div className="flex flex-wrap gap-2">
          {LOCAL_DEVICES.map((device) => (
            <Button
              key={device}
              variant={draft.localDevice === device ? 'default' : 'outline'}
              aria-pressed={draft.localDevice === device}
              onClick={() => onDraftChange({ localDevice: device })}
            >
              {LOCAL_DEVICE_LABELS[device]}
            </Button>
          ))}
        </div>
      </ConfigField>
    </div>
  )
}