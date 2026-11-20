import type { PlayerController } from '../contracts/player'
import type { GameSession } from './GameSession'

/**
 * 让指定的 Controller 为当前玩家做一次决策，并通过 Session 统一提交。
 * 返回是否真正执行了一步（对局已结束或非当前玩家时返回 false）。
 * 决策期间被取消（AbortSignal）则不提交、不改变状态。
 */
export async function runControllerTurn<S, A, O, E>(
  session: GameSession<S, A, O, E>,
  controller: PlayerController<O, A>,
  signal: AbortSignal,
): Promise<boolean> {
  const snapshot = session.getSnapshot()
  if (snapshot.result !== null) {
    return false
  }
  const playerId = snapshot.currentPlayer
  if (playerId === null) {
    return false
  }

  const game = session.getGame()
  const observation = game.observe(snapshot.state, playerId)
  const legalActions = game.getLegalActions(snapshot.state, playerId)

  const action = await controller.decide({
    playerId,
    observation,
    legalActions,
    turn: snapshot.version,
    signal,
  })

  if (signal.aborted) {
    return false
  }
  session.dispatch(playerId, action)
  return true
}