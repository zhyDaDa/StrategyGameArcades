import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker'
import { useEffect, useRef, useState } from 'react'
import type { editor as MonacoEditor, IDisposable } from 'monaco-editor'
import { useTheme } from '@/presentation/theme'

type MonacoApi = typeof import('monaco-editor')

let monacoPromise: Promise<MonacoApi> | null = null

/** Monaco 按需加载；只有打开代码编辑器时才下载对应 chunk。 */
function loadMonaco(): Promise<MonacoApi> {
  if (monacoPromise === null) {
    monacoPromise = import('monaco-editor').then((monaco) => {
      ;(self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
        getWorker: () => new EditorWorker(),
      }
      return monaco
    })
  }
  return monacoPromise
}

export interface StrategyEditorProps {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly height?: number
}

/**
 * JavaScript 策略编辑器。Monaco 只负责编辑体验与语法高亮，
 * 真正执行永远发生在 QuickJS Worker 里，绝不调用页面内的 eval / new Function。
 */
export function StrategyEditor({ value, onChange, height = 340 }: StrategyEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const { mode } = useTheme()

  useEffect(() => {
    let disposed = false
    let instance: MonacoEditor.IStandaloneCodeEditor | null = null
    let subscription: IDisposable | null = null

    void loadMonaco()
      .then((monaco) => {
        if (disposed || containerRef.current === null) {
          return
        }
        const editor = monaco.editor.create(containerRef.current, {
          value,
          language: 'javascript',
          theme: mode === 'dark' ? 'vs-dark' : 'vs',
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 12,
          tabSize: 2,
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'line',
        })
        instance = editor
        editorRef.current = editor
        subscription = editor.onDidChangeModelContent(() => {
          onChangeRef.current(editor.getValue())
        })
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (!disposed) {
          setStatus('error')
          setError(err instanceof Error ? err.message : String(err))
        }
      })

    return () => {
      disposed = true
      subscription?.dispose()
      instance?.dispose()
      editorRef.current = null
    }
    // 编辑器只创建一次；外部 value 变化由下面的 effect 同步。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (status !== 'ready') {
      return
    }
    void loadMonaco().then((monaco) => {
      monaco.editor.setTheme(mode === 'dark' ? 'vs-dark' : 'vs')
    })
  }, [mode, status])

  useEffect(() => {
    const editor = editorRef.current
    if (editor !== null && editor.getValue() !== value) {
      editor.setValue(value)
    }
  }, [value, status])

  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg border"
        style={{ height }}
      />
      {status === 'loading' ? (
        <p className="text-xs text-muted-foreground">编辑器加载中…</p>
      ) : null}
      {status === 'error' ? (
        <p className="text-xs text-destructive">编辑器加载失败：{error}</p>
      ) : null}
    </div>
  )
}