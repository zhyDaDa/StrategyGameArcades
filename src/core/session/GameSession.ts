import type { GameRuntime } from '../contracts/game'
import type { PlayerId } from '../contracts/player'
import type { GameResult } from '../contracts/result'
import type { ActionRecord } from '../history/action-record'

export interface GameSessionSnapshot<S> {
  readonly version: number
  readonly state: Readonly<S>
  readonly currentPlayer: PlayerId | null
  readonly result: GameResult | null
  readonly canUndo: boolean
  readonly canRedo: boolean
}

export type SessionErrorCode = 'game-over' | 'not-your-turn' | 'invalid-action' | 'illegal-action'

export class SessionError extends Error {
  readonly code: SessionErrorCode

  constructor(code: SessionErrorCode, message: string) {
    super(message)
    this.name = 'SessionError'
    this.code = code
  }
}

interface UndoEntry<S, A> {
  readonly state: S
  readonly record: ActionRecord<A>
}

/**
 * 一局游戏唯一的状态所有者与行为执行入口。
 * - `dispatch` 原子化：校验玩家 / Action 结构 / 合法性，全部通过才提交新状态。
 * - 外部只能读取只读快照；任何 View / 动画 / LLM 都不得直接修改内部状态。
 * - 订阅发布的是不可变快照：状态未变化时快照引用保持不变。
 */
export class GameSession<S, A, O, E> {
  private readonly game: GameRuntime<S, A, O, E>
  private state: S
  private version: number
  private nextSequence: number
  private snapshot: GameSessionSnapshot<S>

  private readonly listeners = new Set<() => void>()
  private readonly undoStack: Array<UndoEntry<S, A>> = []
  private readonly redoStack: Array<UndoEntry<S, A>> = []

  constructor(game: GameRuntime<S, A, O, E>) {
    this.game = game
    this.state = game.createInitialState()
    this.version = 0
    this.nextSequence = 0
    this.snapshot = this.buildSnapshot()
  }

  getGame(): GameRuntime<S, A, O, E> {
    return this.game
  }

  getSnapshot(): Readonly<GameSessionSnapshot<S>> {
    return this.snapshot
  }

  getState(): Readonly<S> {
    return this.state
  }

  /** 通往当前状态的行为序列（用于日志与确定性重放）。 */
  getHistory(): readonly ActionRecord<A>[] {
    return this.undoStack.map((entry) => entry.record)
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  dispatch(playerId: PlayerId, action: A): void {
    if (this.snapshot.result !== null) {
      throw new SessionError('game-over', '对局已结束，无法再行动。')
    }
    const currentPlayer = this.snapshot.currentPlayer
    if (currentPlayer === null || playerId !== currentPlayer) {
      throw new SessionError('not-your-turn', `当前应轮到 ${currentPlayer ?? '无'} 行动，而不是 ${playerId}。`)
    }

    let parsed: A
    try {
      parsed = this.game.parseAction(action)
    } catch (err) {
      throw new SessionError('invalid-action', `行动不符合结构约束：${String(err)}`)
    }

    if (!this.game.isActionLegal(this.state, playerId, parsed)) {
      throw new SessionError('illegal-action', '该行动在当前局面不合法。')
    }

    const previous = this.state
    const transition = this.game.reduce(this.state, playerId, parsed)
    const record: ActionRecord<A> = {
      sequence: this.nextSequence,
      playerId,
      action: parsed,
    }
    this.nextSequence += 1

    this.undoStack.push({ state: previous, record })
    this.redoStack.length = 0
    this.state = transition.state
    this.version += 1
    this.snapshot = this.buildSnapshot()
    this.notify()
  }

  undo(): void {
    const entry = this.undoStack.pop()
    if (entry === undefined) {
      return
    }
    this.redoStack.push({ state: this.state, record: entry.record })
    this.state = entry.state
    this.version += 1
    this.snapshot = this.buildSnapshot()
    this.notify()
  }

  redo(): void {
    const entry = this.redoStack.pop()
    if (entry === undefined) {
      return
    }
    this.undoStack.push({ state: this.state, record: entry.record })
    this.state = entry.state
    this.version += 1
    this.snapshot = this.buildSnapshot()
    this.notify()
  }

  reset(): void {
    this.state = this.game.createInitialState()
    this.version += 1
    this.undoStack.length = 0
    this.redoStack.length = 0
    this.snapshot = this.buildSnapshot()
    this.notify()
  }

  private buildSnapshot(): GameSessionSnapshot<S> {
    return {
      version: this.version,
      state: this.state,
      currentPlayer: this.game.getCurrentPlayer(this.state),
      result: this.game.getResult(this.state),
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}