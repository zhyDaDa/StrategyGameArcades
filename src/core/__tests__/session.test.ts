import { describe, expect, it } from 'vitest'
import { GameSession } from '@/core/session/GameSession'
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