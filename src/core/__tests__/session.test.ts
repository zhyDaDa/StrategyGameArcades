import { describe, expect, it } from 'vitest'
import { GameSession, SessionError } from '@/core/session/GameSession'
import { runControllerTurn } from '@/core/session/turn-loop'
import { replayGame } from '@/core/history/replay'
import type { PlayerController } from '@/core/contracts/player'
import { RandomController } from '@/controllers/RandomController'
import { HumanController } from '@/controllers/HumanController'
import { GomokuGame, type GomokuAction, type GomokuEvent, type GomokuObservation, type GomokuState } from '@/games/gomoku'

type Session = GameSession<GomokuState, GomokuAction, GomokuObservation, GomokuEvent>

function newSession(): Session {
  return new GameSession(new GomokuGame())
}

async function playToEnd(
  black: PlayerController<GomokuObservation, GomokuAction>,
  white: PlayerController<GomokuObservation, GomokuAction>,
): Promise<Session> {
  const session = newSession()
  const controllers: Record<string, PlayerController<GomokuObservation, GomokuAction>> = { black, white }
  let guard = 0
  while (session.getSnapshot().result === null && guard < 400) {
    guard += 1
    const player = session.getSnapshot().currentPlayer
    if (player === null) {
      break
    }
    await runControllerTurn(session, controllers[player], new AbortController().signal)
  }
  return session
}

describe('GameSession', () => {
  it('拒绝非当前玩家的行动且不改变状态', () => {
    const session = newSession()
    const version = session.getSnapshot().version
    expect(() => session.dispatch('white', { type: 'place', row: 7, col: 7 })).toThrow()
    expect(session.getSnapshot().version).toBe(version)
  })

  it('拒绝非法落子且不改变状态', () => {
    const session = newSession()
    session.dispatch('black', { type: 'place', row: 7, col: 7 })
    const version = session.getSnapshot().version
    expect(() => session.dispatch('white', { type: 'place', row: 7, col: 7 })).toThrow()
    expect(session.getSnapshot().version).toBe(version)
  })

  it('undo / redo 恢复到正确回合', () => {
    const session = newSession()
    session.dispatch('black', { type: 'place', row: 7, col: 7 })
    session.dispatch('white', { type: 'place', row: 0, col: 0 })
    expect(session.getSnapshot().currentPlayer).toBe('black')

    session.undo()
    expect(session.getSnapshot().currentPlayer).toBe('white')
    session.redo()
    expect(session.getSnapshot().currentPlayer).toBe('black')
  })

  it('相同种子 + 行为序列 => 相同终局（确定性重放）', async () => {
    const a = await playToEnd(
      new RandomController('black', 11),
      new RandomController('white', 12),
    )
    const b = await playToEnd(
      new RandomController('black', 11),
      new RandomController('white', 12),
    )
    expect(b.getState()).toEqual(a.getState())
    // 从行为序列重放应得到相同状态
    expect(replayGame(new GomokuGame(), a.getHistory())).toEqual(a.getState())
  })

  it('HumanController 与 RandomController 走统一协议', async () => {
    const session = newSession()
    const human = new HumanController<GomokuObservation, GomokuAction>('black')
    const random = new RandomController<GomokuObservation, GomokuAction>('white', 42)

    const humanTurn = runControllerTurn(session, human, new AbortController().signal)
    human.submit({ type: 'place', row: 7, col: 7 })
    await humanTurn
    expect(session.getSnapshot().currentPlayer).toBe('white')

    await runControllerTurn(session, random, new AbortController().signal)
    expect(session.getSnapshot().currentPlayer).toBe('black')
  })
})

describe('GameSession 事件与悔棋协商', () => {
  const place = (row: number, col: number): GomokuAction => ({ type: 'place', row, col })

  it('dispatch 把领域事件放进 lastTransition', () => {
    const session = newSession()
    session.dispatch('black', place(7, 7))

    const snapshot = session.getSnapshot()
    expect(snapshot.lastTransition.events).toEqual([
      { type: 'piece.placed', playerId: 'black', row: 7, col: 7 },
    ])
    expect(snapshot.lastActor).toBe('black')
  })

  it('undo / redo / reset 产生空事件', () => {
    const session = newSession()
    session.dispatch('black', place(7, 7))
    session.dispatch('white', place(0, 0))

    session.undo()
    expect(session.getSnapshot().lastTransition.events).toEqual([])
    session.redo()
    expect(session.getSnapshot().lastTransition.events).toEqual([])
    session.reset()
    expect(session.getSnapshot().lastTransition.events).toEqual([])
  })

  it('悔棋必须由最后行动者申请，并由当前玩家应答', () => {
    const session = newSession()
    session.dispatch('black', place(7, 7))
    session.dispatch('white', place(0, 0))

    expect(errorCodeOf(() => session.requestUndo('black'))).toBe('undo-not-last-actor')

    const pending = session.requestUndo('white')
    expect(pending).toMatchObject({ requestedBy: 'white', responder: 'black' })
    expect(session.getSnapshot().pendingUndo).toEqual(pending)

    expect(errorCodeOf(() => session.dispatch('black', place(1, 1)))).toBe('undo-pending')
    expect(errorCodeOf(() => session.resolveUndo('white', true))).toBe('undo-not-responder')

    expect(session.resolveUndo('black', true)).toBe(true)
    const snapshot = session.getSnapshot()
    expect(snapshot.pendingUndo).toBeNull()
    expect(snapshot.currentPlayer).toBe('white')
    expect(snapshot.lastActor).toBe('black')
    expect(snapshot.lastTransition.events).toEqual([])
  })

  it('拒绝悔棋不改变局面', () => {
    const session = newSession()
    session.dispatch('black', place(7, 7))
    session.dispatch('white', place(0, 0))
    const before = session.getState()

    session.requestUndo('white')
    expect(session.resolveUndo('black', false)).toBe(false)

    expect(session.getState()).toBe(before)
    expect(session.getSnapshot().currentPlayer).toBe('black')
    expect(session.getSnapshot().pendingUndo).toBeNull()
  })

  it('没有申请时不能应答，终局后不能申请', () => {
    const session = newSession()
    expect(errorCodeOf(() => session.resolveUndo('black', true))).toBe('no-pending-undo')

    session.dispatch('black', { type: 'resign' })
    expect(errorCodeOf(() => session.requestUndo('black'))).toBe('undo-unavailable')
  })

  it('reset 清空历史并让 nextSequence 归零', () => {
    const session = newSession()
    session.dispatch('black', place(7, 7))
    session.dispatch('white', place(0, 0))

    session.reset()
    expect(session.getHistory()).toHaveLength(0)
    expect(session.getSnapshot().canUndo).toBe(false)
    expect(session.getSnapshot().pendingUndo).toBeNull()

    session.dispatch('black', place(7, 7))
    expect(session.getHistory()[0]).toMatchObject({ sequence: 0, playerId: 'black' })
  })

  it('状态未变化时快照引用保持稳定', () => {
    const session = newSession()
    expect(session.getSnapshot()).toBe(session.getSnapshot())
  })
})

function errorCodeOf(run: () => void): string | undefined {
  try {
    run()
  } catch (error) {
    return error instanceof SessionError ? error.code : undefined
  }
  return undefined
}