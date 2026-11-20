import { useCallback, useSyncExternalStore } from 'react'
import type { GameSession, GameSessionSnapshot } from '@/core/session/GameSession'

/**
 * Session -> React 的订阅桥。`getSnapshot` 在状态未变化时返回同一引用，
 * `subscribe` 保持稳定，满足 useSyncExternalStore 的要求。
 */
export function useGameSnapshot<S, A, O, E>(
  session: GameSession<S, A, O, E>,
): Readonly<GameSessionSnapshot<S>> {
  const subscribe = useCallback(
    (onStoreChange: () => void) => session.subscribe(onStoreChange),
    [session],
  )
  const getSnapshot = useCallback(() => session.getSnapshot(), [session])
  return useSyncExternalStore(subscribe, getSnapshot)
}