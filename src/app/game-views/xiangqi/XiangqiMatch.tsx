import { useEffect, useMemo, useState } from 'react'
import { HumanController } from '@/controllers/HumanController'
import type { PlayerId } from '@/core/contracts/player'
import { GameSession } from '@/core/session/GameSession'
import { XiangqiHeuristicController } from '@/games/xiangqi/ai/XiangqiHeuristicController'
import {
  DEFAULT_XIANGQI_MATCH_CONFIG,
  xiangqiMatchConfigSchema,
  type XiangqiMatchConfig,
} from '@/games/xiangqi/config/match-config'
import {
  XiangqiGame,
  selectXiangqiBoardViewModel,
  type XiangqiAction,
  type XiangqiEvent,
  type XiangqiObservation,
  type XiangqiSide,
  type XiangqiState,
} from '@/games/xiangqi'
import { isXiangqiSide } from '@/games/xiangqi/domain/rules'
import { XiangqiView } from '@/games/xiangqi/ui/XiangqiView'
import {
  toXiangqiPendingUndoViewModel,
  toXiangqiResultViewModel,
  type XiangqiViewMessage,
} from '@/games/xiangqi/ui/xiangqi-view-model'
import { useGameMatch, type MatchPlayer } from '@/presentation/hooks/useGameMatch'
import { assertSeatPlayable } from '@/presentation/match-setup/seat-runtime'
import { gameConfigPath, useRouter } from '@/routers'
import { readStoredMatch, saveStoredMatch } from '../../match-storage'

type XiangqiSession = GameSession<
  XiangqiState,
  XiangqiAction,
  XiangqiObservation,
  XiangqiEvent
>
type XiangqiHuman = HumanController<XiangqiObservation, XiangqiAction>

const GAME_ID = 'xiangqi'

interface XiangqiMatchBundle {
  readonly game: XiangqiGame
  readonly config: XiangqiMatchConfig
  readonly initialState: XiangqiState
  readonly notice: string | null
}

interface XiangqiSeats {
  readonly players: ReadonlyMap<PlayerId, MatchPlayer<XiangqiObservation, XiangqiAction>>
  readonly humans: ReadonlyMap<XiangqiSide, XiangqiHuman>
  readonly humanSides: ReadonlySet<XiangqiSide>
}

export function XiangqiMatch() {
  const { navigate } = useRouter()
  const [bundle] = useState(createBundle)
  const seats = useMemo(() => createSeats(bundle.config), [bundle.config])
  const session = useMemo<XiangqiSession>(
    () => new GameSession(bundle.game, { initialState: bundle.initialState }),
    [bundle],
  )
  const { snapshot, error, thinkingPlayerId, clearError } = useGameMatch({
    session,
    players: seats.players,
  })

  const [notice, setNotice] = useState<string | null>(bundle.notice)
  const [actionError, setActionError] = useState<Error | null>(null)
  const [storageError, setStorageError] = useState<Error | null>(null)

  useEffect(() => {
    try {
      saveStoredMatch(GAME_ID, {
        config: bundle.config,
        save: bundle.game.serialize({ ...snapshot.state }),
      })
      setStorageError(null)
    } catch (err) {
      setStorageError(toError(err))
    }
  }, [bundle, snapshot.state, snapshot.version])

  const playerId = snapshot.currentPlayer
  const currentSide = playerId !== null && isXiangqiSide(playerId) ? playerId : null
  const activeHumanSide =
    currentSide !== null && seats.humans.has(currentSide) ? currentSide : null
  const thinkingSide =
    thinkingPlayerId !== null && isXiangqiSide(thinkingPlayerId)
      ? thinkingPlayerId
      : activeHumanSide === null && currentSide !== null
        ? currentSide
        : null

  const lastActor = snapshot.lastActor
  const undoRequester =
    snapshot.result === null &&
    snapshot.pendingUndo === null &&
    lastActor !== null &&
    isXiangqiSide(lastActor) &&
    seats.humans.has(lastActor)
      ? lastActor
      : null
  const canRequestUndo = undoRequester !== null

  const pendingUndo =
    snapshot.pendingUndo === null
      ? null
      : toXiangqiPendingUndoViewModel(snapshot.pendingUndo, seats.humanSides)
  const result =
    snapshot.result === null
      ? null
      : toXiangqiResultViewModel(snapshot.result, snapshot.state.endReason)
  const board = selectXiangqiBoardViewModel(snapshot.state)

  const message = pickMessage(error, actionError, storageError, notice)

  function submitHuman(action: XiangqiAction) {
    if (currentSide === null || activeHumanSide !== currentSide) {
      return
    }
    if (snapshot.result !== null || snapshot.pendingUndo !== null) {
      return
    }
    const human = seats.humans.get(currentSide)
    if (human === undefined) {
      return
    }
    human.submit(action)
  }

  function handleRequestUndo() {
    const requester = undoRequester
    if (requester === null) {
      return
    }
    try {
      session.requestUndo(requester)
      setActionError(null)
    } catch (err) {
      setActionError(toError(err))
    }
  }

  function handleResolveUndo(accept: boolean) {
    const pending = snapshot.pendingUndo
    if (pending === null) {
      return
    }
    try {
      session.resolveUndo(pending.responder, accept)
      setActionError(null)
    } catch (err) {
      setActionError(toError(err))
    }
  }

  function handleRestart() {
    session.reset()
    setActionError(null)
    setNotice(null)
    clearError()
  }

  function dismissMessage() {
    if (actionError !== null) {
      setActionError(null)
      return
    }
    if (error !== null) {
      clearError()
      return
    }
    if (storageError !== null) {
      setStorageError(null)
      return
    }
    setNotice(null)
  }

  return (
    <XiangqiView
      board={board}
      currentPlayer={currentSide}
      activeHumanSide={activeHumanSide}
      thinkingSide={thinkingSide}
      canRequestUndo={canRequestUndo}
      undoRequester={undoRequester}
      pendingUndo={pendingUndo}
      result={result}
      moveCount={snapshot.state.moveCount}
      message={message}
      onMove={(from, to) => submitHuman({ type: 'move', from, to })}
      onRequestUndo={handleRequestUndo}
      onResolveUndo={handleResolveUndo}
      onRestart={handleRestart}
      onBackToConfig={() => navigate(gameConfigPath(GAME_ID))}
      onDismissMessage={dismissMessage}
    />
  )
}

function createBundle(): XiangqiMatchBundle {
  const game = new XiangqiGame()
  const fallback = (notice: string | null): XiangqiMatchBundle => ({
    game,
    config: DEFAULT_XIANGQI_MATCH_CONFIG,
    initialState: game.createInitialState(),
    notice,
  })

  const stored = readStoredMatch(GAME_ID)
  if (!stored.ok) {
    if (stored.reason === 'invalid') {
      return fallback('本局快照无法读取，已使用默认配置重新开局。')
    }
    return fallback(null)
  }

  const parsedConfig = xiangqiMatchConfigSchema.safeParse(stored.match.config)
  if (!parsedConfig.success) {
    return fallback('本局配置无法识别，已使用默认配置重新开局。')
  }

  try {
    return {
      game,
      config: parsedConfig.data,
      initialState: game.restore(stored.match.save),
      notice: null,
    }
  } catch (error) {
    console.error('[xiangqi] 存档恢复失败', error)
    return fallback('本局存档与当前规则版本不兼容，已重新开局。')
  }
}

function createSeats(config: XiangqiMatchConfig): XiangqiSeats {
  const players = new Map<PlayerId, MatchPlayer<XiangqiObservation, XiangqiAction>>()
  const humans = new Map<XiangqiSide, XiangqiHuman>()

  for (const seat of config.seats) {
    if (seat.type === 'human') {
      const human = new HumanController<XiangqiObservation, XiangqiAction>(seat.id)
      humans.set(seat.id, human)
      players.set(seat.id, { controller: human, role: 'human', undoPolicy: 'ask' })
    } else {
      assertSeatPlayable(seat)
      const ai = new XiangqiHeuristicController(seat.id)
      players.set(seat.id, { controller: ai, role: 'bot', undoPolicy: 'accept' })
    }
  }

  return {
    players,
    humans,
    humanSides: new Set<XiangqiSide>(humans.keys()),
  }
}

function pickMessage(
  error: Error | null,
  actionError: Error | null,
  storageError: Error | null,
  notice: string | null,
): XiangqiViewMessage | null {
  if (actionError !== null) {
    return { type: 'error', text: actionError.message }
  }
  if (error !== null) {
    return { type: 'error', text: error.message }
  }
  if (storageError !== null) {
    return { type: 'error', text: `无法保存本局：${storageError.message}` }
  }
  if (notice !== null) {
    return { type: 'info', text: notice }
  }
  return null
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}