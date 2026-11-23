import { useCallback, useSyncExternalStore } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CONFIG_INPUT_CLASS } from '@/components/game/SeatConfigPanel/ConfigField'
import {
  matchingProfileId,
  profilesVersion,
  readProfiles,
  subscribeProfiles,
  type AiProfile,
  type AiProfileKind,
} from '@/presentation/ai/profiles'
import type { AiSeatConfig } from '@/presentation/match-setup/ai-config'

export interface AiProfilePickerProps {
  readonly kinds: readonly AiProfileKind[]
  readonly current: AiSeatConfig | undefined
  readonly onSelect: (profile: AiProfile) => void
}

const KIND_LABEL: Record<AiProfileKind, string> = {
  'cloud-llm': '云端',
  'local-llm': '本机模型',
  'http-decide': '/decide',
}

/**
 * 从设置页的中央模型配置中选择一个，直接填进当前席位。
 * 「＋」在新标签打开设置页，避免丢失当前对局配置；保存后通过 storage 事件自动刷新。
 */
export function AiProfilePicker({ kinds, current, onSelect }: AiProfilePickerProps) {
  const subscribe = useCallback((listener: () => void) => subscribeProfiles(listener), [])
  const snapshot = useCallback(() => profilesVersion(), [])
  useSyncExternalStore(subscribe, snapshot, snapshot)

  const profiles = readProfiles().filter((profile) => kinds.includes(profile.kind))
  const matchedId = matchingProfileId(current, profiles)
  const isCustom = current !== undefined && matchedId === null

  function select(id: string) {
    const profile = profiles.find((item) => item.id === id)
    if (profile !== undefined) {
      onSelect(profile)
    }
  }

  function openSettings(create = false) {
    window.open(
      create ? '/settings?new=profile#ai-profiles' : '/settings#ai-profiles',
      '_blank',
      'noopener',
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">从「设置 → AI 配置」选择</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openSettings(true)}>
            <Plus className="size-3.5" />
            新建配置
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openSettings(false)}>
            <RefreshCw className="size-3.5" />
            管理
          </Button>
        </div>
      </div>

      <select
        value={matchedId ?? ''}
        onChange={(event) => select(event.target.value)}
        className={CONFIG_INPUT_CLASS}
        aria-label="选择已保存的模型配置"
      >
        <option value="" disabled>
          {profiles.length === 0 ? '尚未保存任何配置' : '选择一个配置'}
        </option>
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.name} · {KIND_LABEL[profile.kind]} ·{' '}
            {'model' in profile ? profile.model : profile.endpoint}
          </option>
        ))}
      </select>

      {isCustom ? (
        <p className="text-xs text-muted-foreground">
          当前是自定义配置，未关联任何已保存项；可继续使用，或选择一个配置覆盖。
        </p>
      ) : null}
      {profiles.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          先在设置页保存一个配置；保存后这里会自动出现（新标签打开，当前页面配置不会丢失）。
        </p>
      ) : null}
    </div>
  )
}