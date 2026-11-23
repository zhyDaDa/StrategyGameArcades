import type { ReactNode } from 'react'

export const CONFIG_INPUT_CLASS =
  'h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60'

export interface ConfigFieldProps {
  readonly label: string
  readonly hint?: string
  readonly children: ReactNode
}

/** 配置面板里的字段外壳；用于按钮组等非文本控件，避免 label 误触第一个按钮。 */
export function ConfigField({ label, hint, children }: ConfigFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint !== undefined ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  )
}

export interface ConfigTextFieldProps {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly hint?: string
  readonly placeholder?: string
  readonly type?: 'text' | 'password' | 'url'
  readonly disabled?: boolean
  readonly maxLength?: number
}

export function ConfigTextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  type = 'text',
  disabled = false,
  maxLength,
}: ConfigTextFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        className={CONFIG_INPUT_CLASS}
      />
      {hint !== undefined ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  )
}