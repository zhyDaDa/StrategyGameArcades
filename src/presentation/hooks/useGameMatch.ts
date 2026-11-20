import { useEffect, useRef } from 'react'
import { runControllerTurn } from '@/core/session/turn-loop'
import type { PlayerController } from '@/core/contracts/player'
import type { GameSession, GameSessionSnapshot } from '@/core/session/GameSession'
import { useGameSnapshot } from './useGameSnapshot'

/**
 * 对局驱动循环：轮到自动化玩家（随机 / LLM）时自动决策并提交；
 * 人类玩家通过直接 dispatch 完成，不进入此驱动。
 */
export function useGameMatch<S, A, O, E>(params: {
  readonly session: GameSession<S, A, O, E>
  readonly botControllers: ReadonlyMap<string, PlayerController<O, A>>
}): Readonly<GameSessionSnapshot<S>> {
  const { session, botControllers } = params
  const snapshot = useGameSnapshot(session)

  const controllersRef = useRef(botControllers)
  useEffect(() => {
    controllersRef.current = botControllers
  }, [botControllers])

  useEffect(() => {
    const currentPlayer = snapshot.currentPlayer
    if (currentPlayer === null || snapshot.result !== null) {
      return
    }
    const controller = controllersRef.current.get(currentPlayer)
    if (controller === undefined) {
      return
    }
    const abort = new AbortController()
    void runControllerTurn(session, controller, abort.signal).catch(() => {})
    return () => abort.abort()
  }, [session, snapshot.version, snapshot.currentPlayer])

  return snapshot
}