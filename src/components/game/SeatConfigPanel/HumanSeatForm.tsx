import { Button } from '@/components/ui/button'
import { ConfigField, ConfigTextField, CONFIG_INPUT_CLASS } from './ConfigField'

export interface HumanSeatFormProps {
  readonly name: string
  readonly isHost: boolean
  readonly onNameChange: (name: string) => void
  readonly onMakeHost: () => void
}

/** 人类席位：名称与房主。邀请（SSE）在静态部署下暂未接通，先保留位置。 */
export function HumanSeatForm({
  name,
  isHost,
  onNameChange,
  onMakeHost,
}: HumanSeatFormProps) {
  return (
    <div className="flex flex-col gap-6">
      <ConfigTextField
        label="玩家名称"
        value={name}
        onChange={onNameChange}
        placeholder="例如：小林"
        maxLength={24}
        hint="对局中显示的名称；留空则使用席位名。"
      />

      <ConfigField
        label="本局房主"
        hint="房主是本机操作者，由这个人负责点击与落子；同一个浏览器里可以热座轮换。"
      >
        {isHost ? (
          <span className="w-fit rounded-lg border border-primary/40 bg-primary/5 px-3 py-1.5 text-sm text-primary">
            当前房主
          </span>
        ) : (
          <Button variant="outline" size="sm" className="w-fit" onClick={onMakeHost}>
            设为本局房主
          </Button>
        )}
      </ConfigField>

      <ConfigField
        label="邀请地址"
        hint="静态部署下暂只支持本机热座。在线邀请需要实时通道（SSE），将在后续版本接入。"
      >
        <input
          type="text"
          disabled
          placeholder="邀请地址（尚未接入）"
          className={CONFIG_INPUT_CLASS}
        />
      </ConfigField>
    </div>
  )
}