import { useCallback, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { CONFIG_INPUT_CLASS } from './ConfigField'
import {
  createCredentialId,
  credentialStore,
} from '@/presentation/ai/credential-store'

export interface CredentialFieldProps {
  readonly label: string
  readonly hint?: string
  readonly optional?: boolean
  readonly credentialId: string | null
  readonly onChange: (credentialId: string | null) => void
}

/**
 * 凭据输入与状态管理。已保存的 Key 不会回填到输入框，避免把明文重新渲染到 DOM。
 * 「记住 Key」写入 localStorage 是明文存储，界面必须如实说明。
 */
export function CredentialField({
  label,
  hint,
  optional = false,
  credentialId,
  onChange,
}: CredentialFieldProps) {
  const subscribe = useCallback((listener: () => void) => credentialStore.subscribe(listener), [])
  const snapshot = useCallback(() => credentialStore.getSnapshotVersion(), [])
  useSyncExternalStore(subscribe, snapshot, snapshot)

  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [visible, setVisible] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saved = credentialStore.has(credentialId)
  const remembered = credentialStore.isRemembered(credentialId)
  const lost = credentialId !== null && !saved

  function save() {
    if (value.trim() === '') {
      setError('请填写 Key。')
      return
    }
    try {
      // 更换 Key 时生成新 id，使配置指纹变化，旧的接入测试结果自动失效。
      const replacing = credentialId !== null && saved
      const id = replacing ? createCredentialId() : (credentialId ?? createCredentialId())
      credentialStore.set(id, value, remember)
      if (replacing && credentialId !== null) {
        credentialStore.remove(credentialId)
      }
      onChange(id)
      setValue('')
      setEditing(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function remove() {
    if (!window.confirm('删除这个 Key？引用它的 AI 席位需要重新配置。')) {
      return
    }
    if (credentialId !== null) {
      credentialStore.remove(credentialId)
    }
    onChange(null)
    setEditing(false)
    setError(null)
  }

  function toggleRemember(next: boolean) {
    setRemember(next)
    if (credentialId !== null && saved) {
      credentialStore.setRemembered(credentialId, next)
    }
  }

  const showInput = editing || !saved

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {label}
          {optional ? <span className="ml-1 text-xs text-muted-foreground">（可选）</span> : null}
        </span>
        {saved && !editing ? (
          <span className="text-xs text-[var(--color-green)]">
            {remembered ? '已保存到本机' : '仅在本次会话内存中'}
          </span>
        ) : null}
      </div>

      {lost ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
          此配置引用的凭据已不在本机（可能未勾选记住，或已被清除）。请重新填写。
        </p>
      ) : null}

      {showInput ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type={visible ? 'text' : 'password'}
              value={value}
              onChange={(event) => {
                setValue(event.target.value)
                setError(null)
              }}
              placeholder={saved ? '输入新 Key 以替换' : '在此输入 Key，不会发送到本站服务器'}
              maxLength={4096}
              autoComplete="off"
              className={CONFIG_INPUT_CLASS}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setVisible((current) => !current)}
            >
              {visible ? '隐藏' : '显示'}
            </Button>
          </div>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => toggleRemember(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              记住 Key（写入 localStorage，明文保存；任何同源脚本都能读取，无法防范 XSS）。
            </span>
          </label>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={save}>
              保存 Key
            </Button>
            {saved ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(false)
                  setValue('')
                  setError(null)
                }}
              >
                取消
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2.5 text-xs">
          <span className="text-muted-foreground">Key 已保存；不会再次显示明文。</span>
          {remembered ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toggleRemember(false)}
            >
              改为仅内存
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toggleRemember(true)}
            >
              记住到本机
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => {
            setEditing(true)
            setRemember(remembered)
          }}>
            更换
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={remove}>
            删除
          </Button>
        </div>
      )}

      {error !== null ? <p className="text-xs text-destructive">{error}</p> : null}
      {hint !== undefined ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}