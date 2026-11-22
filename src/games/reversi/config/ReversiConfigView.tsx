import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ReversiGame } from '../domain/ReversiGame'
import type { ReversiSide } from '../domain/types'
import {
  REVERSI_RULES_SUMMARY,
  type ReversiMatchConfig,
  type ReversiMatchMode,
} from './match-config'

export interface ReversiConfigViewProps {
  readonly onStart: (payload: { readonly config: ReversiMatchConfig; readonly save: string }) => void
}

const MODE_LABELS: Record<ReversiMatchMode, { title: string; description: string }> = {
  'human-vs-ai': {
    title: '人机对战',
    description: '你与启发式 AI 对弈，AI 会自动同意悔棋。',
  },
  local: {
    title: '本地双人',
    description: '两位玩家共用一台设备，悔棋需要对方同意。',
  },
}

export function ReversiConfigView({ onStart }: ReversiConfigViewProps) {
  const [mode, setMode] = useState<ReversiMatchMode>('human-vs-ai')
  const [humanSide, setHumanSide] = useState<ReversiSide>('black')

  function start() {
    const game = new ReversiGame()
    const config: ReversiMatchConfig =
      mode === 'local' ? { mode } : { mode, humanSide }
    onStart({ config, save: game.serialize(game.createInitialState()) })
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold tracking-tight">对局模式</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(MODE_LABELS) as ReversiMatchMode[]).map((value) => {
              const active = mode === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMode(value)}
                  className={[
                    'flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors',
                    active
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted',
                  ].join(' ')}
                >
                  <span className="text-sm font-medium">{MODE_LABELS[value].title}</span>
                  <span className="text-xs text-muted-foreground">
                    {MODE_LABELS[value].description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {mode === 'human-vs-ai' ? (
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold tracking-tight">执子</h2>
            <div className="flex gap-2">
              <Button
                variant={humanSide === 'black' ? 'default' : 'outline'}
                aria-pressed={humanSide === 'black'}
                onClick={() => setHumanSide('black')}
              >
                执黑（先手）
              </Button>
              <Button
                variant={humanSide === 'white' ? 'default' : 'outline'}
                aria-pressed={humanSide === 'white'}
                onClick={() => setHumanSide('white')}
              >
                执白（后手）
              </Button>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          {REVERSI_RULES_SUMMARY}
        </div>
      </div>

      <aside className="flex h-fit flex-col gap-4 rounded-xl border p-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground">
            MATCH / 本局
          </p>
          <p className="text-sm">
            {mode === 'local'
              ? '本地双人 · 黑方先手'
              : `你执${humanSide === 'black' ? '黑' : '白'} · AI 执${humanSide === 'black' ? '白' : '黑'}`}
          </p>
        </div>
        <Button size="lg" onClick={start}>
          开始对局
        </Button>
        <p className="text-xs text-muted-foreground">
          开始后会写入本局初始快照；刷新页面可继续当前局面。
        </p>
      </aside>
    </section>
  )
}