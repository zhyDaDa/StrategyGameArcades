import { useCallback, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import {
  ConfigField,
  ConfigTextField,
  CONFIG_INPUT_CLASS,
} from '@/components/game/SeatConfigPanel/ConfigField'
import { CredentialField } from '@/components/game/SeatConfigPanel/CredentialField'
import { credentialStore } from '@/presentation/ai/credential-store'
import {
  AI_PROFILE_KINDS,
  deleteProfile,
  profilesVersion,
  readProfiles,
  saveProfile,
  subscribeProfiles,
  type AiProfile,
  type AiProfileDraft,
  type AiProfileKind,
} from '@/presentation/ai/profiles'
import {
  LLM_PROVIDER_KINDS,
  type LlmProviderKind,
} from '@/presentation/match-setup/ai-config'
import {
  AI_PROFILE_KIND_DESCRIPTIONS,
  AI_PROFILE_KIND_LABELS,
  PROVIDER_PRESETS,
  emptyProfileDraft,
  profileEndpointHint,
  type ProviderPresetKey,
} from '@/presentation/ai/profile-form'

export interface AiProfileManagerProps {
  readonly onCreate: () => void
  readonly onEdit: (profile: AiProfile) => void
}

/** 设置主页里的模型配置列表；编辑器在 ConfigDeck 的右侧整页中。 */
export function AiProfileManager({ onCreate, onEdit }: AiProfileManagerProps) {
  const subscribe = useCallback((listener: () => void) => subscribeProfiles(listener), [])
  const snapshot = useCallback(() => profilesVersion(), [])
  useSyncExternalStore(subscribe, snapshot, snapshot)

  const profiles = readProfiles()

  function remove(profile: AiProfile) {
    if (!window.confirm(`删除配置「${profile.name}」？`)) {
      return
    }
    deleteProfile(profile.id)
    if (
      profile.credentialId !== null &&
      !readProfiles().some((item) => item.credentialId === profile.credentialId)
    ) {
      credentialStore.remove(profile.credentialId)
    }
  }

  return (
    <section id="ai-profiles" className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold tracking-tight">AI 配置</h2>
          <p className="text-sm text-muted-foreground">
            在这里集中维护云端与本地模型配置；每个游戏席位只需下拉选择，不再重复填写。
          </p>
        </div>
        <Button variant="outline" onClick={onCreate}>
          新建配置
        </Button>
      </div>

      <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
        配置保存在浏览器 localStorage；保存时会把 Key 标记为「记住」，以明文写入 localStorage。
        任何同源脚本都能读取；配置不会上传到本站服务器。
      </p>

      {profiles.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          还没有模型配置。新建一个后，游戏配置页就能直接选择。
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {profiles.map((profile) => (
            <li
              key={profile.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 text-sm"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium">{profile.name}</span>
                <span className="text-xs text-muted-foreground">
                  {AI_PROFILE_KIND_LABELS[profile.kind]}
                  {profile.kind === 'cloud-llm' ? ` · ${profile.provider}` : ''}
                  {profile.kind !== 'http-decide' ? ` · ${profile.model}` : ''}
                </span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  {profile.endpoint}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(profile)}>
                  编辑
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(profile)}>
                  删除
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export interface AiProfileEditorProps {
  readonly draft: AiProfileDraft
  readonly onChange: (draft: AiProfileDraft) => void
  readonly onClose: () => void
}

/**
 * 整页模型配置页。保存成功后回到设置主页；任何校验错误都留在当前页。
 */
export function AiProfileEditor({ draft, onChange, onClose }: AiProfileEditorProps) {
  const [error, setError] = useState<string | null>(null)

  function update(patch: Partial<AiProfileDraft>) {
    onChange({ ...draft, ...patch })
  }

  function switchKind(kind: AiProfileKind) {
    if (draft.kind === kind) {
      return
    }
    onChange({ ...emptyProfileDraft(kind), id: draft.id, name: draft.name })
  }

  function switchProvider(provider: LlmProviderKind) {
    const preset = PROVIDER_PRESETS[provider]
    update({
      provider,
      endpoint: preset.endpoint,
      model: preset.model,
      credentialId: null,
    })
  }

  function applyLocalPreset(key: ProviderPresetKey) {
    const preset = PROVIDER_PRESETS[key]
    update({ endpoint: preset.endpoint, model: preset.model })
  }

  function save() {
    if (draft.credentialId !== null && !credentialStore.has(draft.credentialId)) {
      setError('Key 只填在输入框里，还没有保存。请先点击「保存 Key」。')
      return
    }
    try {
      const profile = saveProfile(draft)
      if (profile.credentialId !== null) {
        // profile 保存在 localStorage，Key 也必须一起持久化，否则刷新后配置失效。
        credentialStore.setRemembered(profile.credentialId, true)
      }
      setError(null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-end justify-between gap-4 border-b pb-6">
        <div className="flex min-w-0 flex-col">
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">
            AI / 模型配置
          </p>
          <h2 className="truncate text-2xl font-semibold tracking-tight">
            {draft.id === undefined ? '新建配置' : '编辑配置'}
            {draft.name.trim() !== '' ? ` · ${draft.name}` : ''}
          </h2>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="配置类型" className="flex flex-col gap-2 py-6">
          {AI_PROFILE_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={draft.kind === kind}
              onClick={() => switchKind(kind)}
              className={[
                'flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors duration-200 ease-out',
                draft.kind === kind
                  ? 'border-[var(--color-blue)] bg-[var(--color-blue)]/10'
                  : 'hover:bg-muted/40',
              ].join(' ')}
            >
              <span
                className={[
                  'text-sm font-medium',
                  draft.kind === kind ? 'text-[var(--color-blue)]' : '',
                ].join(' ')}
              >
                {AI_PROFILE_KIND_LABELS[kind]}
              </span>
              <span className="text-xs text-muted-foreground">{AI_PROFILE_KIND_DESCRIPTIONS[kind]}</span>
            </button>
          ))}
        </nav>

        <div className="scroll-area min-h-0 min-w-0 overflow-y-auto py-6">
          <div className="flex flex-col gap-5">
            <ConfigTextField
              label="配置名称"
              value={draft.name}
              onChange={(name) => update({ name })}
              placeholder="例如：GPT-4.1 mini / 本机 Ollama"
              maxLength={80}
              hint="只用于下拉框识别，不发送给模型服务。"
            />

            {draft.kind === 'cloud-llm' ? (
              <ConfigField label="协议" hint="只支持这两种已知请求协议，不猜测私有格式。">
                <div className="flex flex-wrap gap-2">
                  {LLM_PROVIDER_KINDS.map((provider) => (
                    <Button
                      key={provider}
                      type="button"
                      variant={draft.provider === provider ? 'default' : 'outline'}
                      aria-pressed={draft.provider === provider}
                      onClick={() => switchProvider(provider)}
                    >
                      {provider === 'openai-compatible' ? 'OpenAI 兼容' : 'Anthropic Messages'}
                    </Button>
                  ))}
                </div>
              </ConfigField>
            ) : null}

            {draft.kind === 'local-llm' ? (
              <ConfigField label="快速预填" hint="只填示例地址；实际可用性取决于本机服务与 CORS。">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyLocalPreset('local-ollama')}
                  >
                    Ollama
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyLocalPreset('local-lmstudio')}
                  >
                    LM Studio
                  </Button>
                </div>
              </ConfigField>
            ) : null}

            <ConfigTextField
              label="完整请求地址"
              type="url"
              value={draft.endpoint}
              onChange={(endpoint) => update({ endpoint })}
              placeholder="https://api.openai.com/v1/chat/completions"
              hint={profileEndpointHint(draft.kind)}
            />

            {draft.kind !== 'http-decide' ? (
              <ConfigTextField
                label="模型 ID"
                value={draft.model}
                onChange={(model) => update({ model })}
                placeholder="例如 gpt-4.1-mini / qwen2.5:7b"
                hint="由服务提供方决定，本站不内置模型列表。"
              />
            ) : null}

            <ConfigField label="超时" hint="单位毫秒；超时会取消本次请求，本回合不会落子。">
              <input
                type="number"
                min={1000}
                max={120000}
                step={1000}
                value={draft.timeoutMs}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  if (Number.isFinite(value)) {
                    update({ timeoutMs: Math.min(120_000, Math.max(1_000, value)) })
                  }
                }}
                className={`${CONFIG_INPUT_CLASS} w-32`}
              />
            </ConfigField>

            <CredentialField
              label={draft.kind === 'http-decide' ? '访问令牌（可选）' : 'API Key'}
              optional={draft.kind !== 'cloud-llm'}
              credentialId={draft.credentialId}
              onChange={(credentialId) => update({ credentialId })}
              hint="保存配置时会自动把 Key 标记为「记住」，否则刷新后配置不可用。"
            />

            {error !== null ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button onClick={save}>保存配置</Button>
      </footer>
    </section>
  )
}