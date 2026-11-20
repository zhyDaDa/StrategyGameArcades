import { useCallback, useEffect, useRef, useState } from 'react'
import { runControllerTurn } from '@/core/session/turn-loop'
import type { PlayerController, PlayerId } from '@/core/contracts/player'
import type { GameSession, GameSessionSnapshot } from '@/core/session/GameSession'
import { pacingTokens } from '@/presentation/pacing/tokens'
import { waitForPacing, withMinimumThinkTime } from '@/presentation/pacing/withMinimumThinkTime'
import { useGameSnapshot } from './useGameSnapshot'

export type UndoPolicy = 'accept' | 'reject' | 'ask'

/** 一个座位上的玩家：统一的 Controller + 是否自动 + 悔棋应答策略。 */
export interface MatchPlayer<O, A> {
  readonly controller: PlayerController<O, A>
  readonly role: 'human' | 'bot'
  readonly undoPolicy: UndoPolicy
}

export interface UseGameMatchParams<S, A, O, E> {
  readonly session: GameSession<S, A, O, E>
  readonly players: ReadonlyMap<PlayerId, MatchPlayer<O, A>>
  readonly minimumThinkMs?: number
}

export interface UseGameMatchResult<S, E> {
  readonly snapshot: Readonly<GameSessionSnapshot<S, E>>
  readonly error: Error | null
  readonly thinkingPlayerId: PlayerId | null
  readonly clearError: () => void
}

/**
 * 对局驱动循环：所有玩家（包括人类）都走统一的 Controller 协议。
 * - 轮到 bot：按最短思考时长节流后自动决策并提交。
 * - 轮到人类：保持 pending，等待 UI 调 `HumanController.submit`。
 * - 悔棋协商中：bot 按 undoPolicy 自动应答；人类交给 UI 弹窗。
 * 任何版本变化都会 abort 上一次决策，避免悔棋后旧决策继续落子。
 */
export function useGameMatch<S, A, O, E>(
  params: UseGameMatchParams<S, A, O, E>,
): UseGameMatchResult<S, E> {
  const { session, players, minimumThinkMs = pacingTokens.aiMinimumThinkMs } = params
  const snapshot = useGameSnapshot(session)
  const [error, setError] = useState<Error | null>(null)
  const [thinkingPlayerId, setThinkingPlayerId] = useState<PlayerId | null>(null)

  const playersRef = useRef(players)
  useEffect(() => {
    playersRef.current = players
  }, [players])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  useEffect(() => {
    const pending = snapshot.pendingUndo

    if (pending !== null) {
      const responder = playersRef.current.get(pending.responder)
      if (responder === undefined || responder.role !== 'bot') {
        setThinkingPlayerId(null)
        return
      }

      const abort = new AbortController()
      const accept = responder.undoPolicy !== 'reject'
      setThinkingPlayerId(pending.responder)
      void waitForPacing(minimumThinkMs, abort.signal)
        .then(() => {
          if (abort.signal.aborted) {
            return
          }
          session.resolveUndo(pending.responder, accept)
        })
        .catch((err) => {
          if (!isAbortError(err)) setError(toError(err))
        })
      return () => {
        abort.abort()
        setThinkingPlayerId((current) => (current === pending.responder ? null : current))
      }
    }

    if (snapshot.result !== null || snapshot.currentPlayer === null) {
      setThinkingPlayerId(null)
      return
    }

    const playerId = snapshot.currentPlayer
    const binding = playersRef.current.get(playerId)
    if (binding === undefined) {
      setThinkingPlayerId(null)
      return
    }

    const abort = new AbortController()
    const isBot = binding.role === 'bot'
    setThinkingPlayerId(isBot ? playerId : null)

    const controller = isBot
      ? withMinimumThinkTime(binding.controller, minimumThinkMs)
      : binding.controller

    void runControllerTurn(session, controller, abort.signal)
      .catch((err) => {
        if (!isAbortError(err)) setError(toError(err))
      })
      .finally(() => {
        if (!abort.signal.aborted) setThinkingPlayerId(null)
      })

    return () => {
      abort.abort()
      setThinkingPlayerId((current) => (current === playerId ? null : current))
    }
  }, [
    session,
    snapshot.version,
    snapshot.currentPlayer,
    snapshot.pendingUndo,
    snapshot.result,
    minimumThinkMs,
  ])

  return { snapshot, error, thinkingPlayerId, clearError }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}