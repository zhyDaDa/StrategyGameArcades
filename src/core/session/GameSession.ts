import type { GameRuntime } from '../contracts/game'
import type { PlayerId } from '../contracts/player'
import type { GameResult } from '../contracts/result'
import type { ActionRecord } from '../history/action-record'

/** 一次 transition 的产出索引与领域事件；index 即产生它时的 version。 */
export interface SessionTransition<E> {
  readonly index: number
  readonly events: readonly E[]
}

/** 悔棋协商：申请者必须是最后一步的行为者，应答者是当前玩家。 */
export interface PendingUndo {
  readonly requestedBy: PlayerId
  readonly responder: PlayerId
  readonly targetSequence: number
}

export interface GameSessionSnapshot<S, E> {
  readonly version: number
  readonly state: Readonly<S>
  readonly currentPlayer: PlayerId | null
  readonly result: GameResult | null
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly lastActor: PlayerId | null
  readonly pendingUndo: PendingUndo | null
  readonly lastTransition: SessionTransition<E>
}

export type SessionErrorCode =
  | 'game-over'
  | 'not-your-turn'
  | 'invalid-action'
  | 'illegal-action'
  | 'undo-unavailable'
  | 'undo-pending'
  | 'undo-not-last-actor'
  | 'undo-not-responder'
  | 'no-pending-undo'

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

export interface GameSessionOptions<S> {
  /** 从存档恢复时注入的局面；缺省则创建初始局面。 */
  readonly initialState?: S
}

/**
 * 一局游戏唯一的状态所有者与行为执行入口。
 * - `dispatch` 原子化：校验玩家 / Action 结构 / 合法性，全部通过才提交新状态。
 * - 悔棋是元操作：复用 Action History + 快照，并经过「申请 -> 对方应答」的协商。
 * - 外部只能读取只读快照；任何 View / 动画 / LLM 都不得直接修改内部状态。
 * - 订阅发布的是不可变快照：状态未变化时快照引用保持不变。
 */
export class GameSession<S, A, O, E> {
  private readonly game: GameRuntime<S, A, O, E>
  private state: S
  private version: number
  private nextSequence: number
  private snapshot: GameSessionSnapshot<S, E>
  private pendingUndo: PendingUndo | null = null
  private lastTransition: SessionTransition<E> = { index: 0, events: [] }

  private readonly listeners = new Set<() => void>()
  private readonly undoStack: Array<UndoEntry<S, A>> = []
  private readonly redoStack: Array<UndoEntry<S, A>> = []

  constructor(game: GameRuntime<S, A, O, E>, options: GameSessionOptions<S> = {}) {
    this.game = game
    this.state = options.initialState ?? game.createInitialState()
    this.version = 0
    this.nextSequence = 0
    this.snapshot = this.buildSnapshot()
  }

  getGame(): GameRuntime<S, A, O, E> {
    return this.game
  }

  getSnapshot(): Readonly<GameSessionSnapshot<S, E>> {
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
    if (this.pendingUndo !== null) {
      throw new SessionError('undo-pending', '悔棋申请等待应答，暂时不能落子。')
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
    this.publish({ index: this.version, events: transition.events })
  }

  /**
   * 申请撤回最后一步。只有最后一步的行为者可以申请，
   * 应答者是当前玩家；终局后不再允许。
   */
  requestUndo(requester: PlayerId): PendingUndo {
    if (this.snapshot.result !== null) {
      throw new SessionError('undo-unavailable', '对局已结束，只能重新开局。')
    }
    if (this.pendingUndo !== null) {
      throw new SessionError('undo-pending', '已经有一条悔棋申请在等待应答。')
    }
    const entry = this.undoStack[this.undoStack.length - 1]
    if (entry === undefined) {
      throw new SessionError('undo-unavailable', '还没有可以撤回的行为。')
    }
    if (entry.record.playerId !== requester) {
      throw new SessionError('undo-not-last-actor', '只有刚行动过的玩家可以申请悔棋。')
    }
    const responder = this.snapshot.currentPlayer
    if (responder === null || responder === requester) {
      throw new SessionError('undo-unavailable', '当前没有可以对这份申请作答的玩家。')
    }

    const pending: PendingUndo = {
      requestedBy: requester,
      responder,
      targetSequence: entry.record.sequence,
    }
    this.pendingUndo = pending
    this.version += 1
    this.publish({ index: this.version, events: [] })
    return pending
  }

  /** 应答悔棋申请；只有 pendingUndo.responder 可以作答。 */
  resolveUndo(responder: PlayerId, accept: boolean): boolean {
    const pending = this.pendingUndo
    if (pending === null) {
      throw new SessionError('no-pending-undo', '当前没有等待应答的悔棋申请。')
    }
    if (pending.responder !== responder) {
      throw new SessionError('undo-not-responder', `这条悔棋申请应由 ${pending.responder} 应答。`)
    }

    if (accept) {
      this.applyUndo()
    }
    this.pendingUndo = null
    this.version += 1
    this.publish({ index: this.version, events: [] })
    return accept
  }

  undo(): void {
    if (this.undoStack.length === 0) {
      return
    }
    this.applyUndo()
    this.pendingUndo = null
    this.version += 1
    this.publish({ index: this.version, events: [] })
  }

  redo(): void {
    const entry = this.redoStack.pop()
    if (entry === undefined) {
      return
    }
    this.undoStack.push({ state: this.state, record: entry.record })
    this.state = entry.state
    this.pendingUndo = null
    this.version += 1
    this.publish({ index: this.version, events: [] })
  }

  reset(): void {
    this.state = this.game.createInitialState()
    this.version += 1
    this.nextSequence = 0
    this.undoStack.length = 0
    this.redoStack.length = 0
    this.pendingUndo = null
    this.publish({ index: this.version, events: [] })
  }

  private applyUndo(): void {
    const entry = this.undoStack.pop()
    if (entry === undefined) {
      return
    }
    this.redoStack.push({ state: this.state, record: entry.record })
    this.state = entry.state
  }

  private publish(transition: SessionTransition<E>): void {
    this.lastTransition = transition
    this.snapshot = this.buildSnapshot()
    this.notify()
  }

  private buildSnapshot(): GameSessionSnapshot<S, E> {
    const lastEntry = this.undoStack[this.undoStack.length - 1]
    return {
      version: this.version,
      state: this.state,
      currentPlayer: this.game.getCurrentPlayer(this.state),
      result: this.game.getResult(this.state),
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      lastActor: lastEntry === undefined ? null : lastEntry.record.playerId,
      pendingUndo: this.pendingUndo,
      lastTransition: this.lastTransition,
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}