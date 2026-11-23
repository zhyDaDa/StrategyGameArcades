import { useEffect, useMemo, useState } from 'react'
import { HumanController } from '@/controllers/HumanController'
import type { PlayerId } from '@/core/contracts/player'
import { GameSession } from '@/core/session/GameSession'
import { ReversiHeuristicController } from '@/games/reversi/ai/ReversiHeuristicController'
import {
  DEFAULT_REVERSI_MATCH_CONFIG,
  reversiMatchConfigSchema,
  type ReversiMatchConfig,
} from '@/games/reversi/config/match-config'
import {
  ReversiGame,
  selectDiscCounts,
  selectReversiBoardViewModel,
  type ReversiAction,
  type ReversiEvent,
  type ReversiObservation,
  type ReversiSide,
  type ReversiState,
} from '@/games/reversi'
import { isReversiSide } from '@/games/reversi/domain/rules'
import { ReversiView } from '@/games/reversi/ui/ReversiView'
import {
  selectPassedSide,
  toReversiPendingUndoViewModel,
  toReversiResultViewModel,
  type ReversiViewMessage,
} from '@/games/reversi/ui/reversi-view-model'
import { useGameMatch, type MatchPlayer } from '@/presentation/hooks/useGameMatch'
import { assertSeatPlayable } from '@/presentation/match-setup/seat-runtime'
import { gameConfigPath, useRouter } from '@/routers'
import { readStoredMatch, saveStoredMatch } from '../../match-storage'

type ReversiSession = GameSession<ReversiState, ReversiAction, ReversiObservation, ReversiEvent>
type ReversiHuman = HumanController<ReversiObservation, ReversiAction>

const GAME_ID = 'reversi'

interface ReversiMatchBundle {
  readonly game: ReversiGame
  readonly config: ReversiMatchConfig
  readonly initialState: ReversiState
  readonly notice: string | null
}

interface ReversiSeats {
  readonly players: ReadonlyMap<PlayerId, MatchPlayer<ReversiObservation, ReversiAction>>
  readonly humans: ReadonlyMap<ReversiSide, ReversiHuman>
  readonly humanSides: ReadonlySet<ReversiSide>
}

export function ReversiMatch() {
  const { navigate } = useRouter()
  const [bundle] = useState(createBundle)
  const seats = useMemo(() => createSeats(bundle.config), [bundle.config])
  const session = useMemo<ReversiSession>(
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
  const currentSide = playerId !== null && isReversiSide(playerId) ? playerId : null
  const activeHumanSide =
    currentSide !== null && seats.humans.has(currentSide) ? currentSide : null
  const thinkingSide =
    thinkingPlayerId !== null && isReversiSide(thinkingPlayerId)
      ? thinkingPlayerId
      : activeHumanSide === null && currentSide !== null
        ? currentSide
        : null

  const lastActor = snapshot.lastActor
  const undoRequester =
    snapshot.result === null &&
    snapshot.pendingUndo === null &&
    lastActor !== null &&
    isReversiSide(lastActor) &&
    seats.humans.has(lastActor)
      ? lastActor
      : null
  const canRequestUndo = undoRequester !== null

  const pendingUndo =
    snapshot.pendingUndo === null
      ? null
      : toReversiPendingUndoViewModel(snapshot.pendingUndo, seats.humanSides)
  const counts = selectDiscCounts(snapshot.state)
  const result =
    snapshot.result === null ? null : toReversiResultViewModel(snapshot.result, counts)
  const passedSide =
    snapshot.result === null ? selectPassedSide(snapshot.lastTransition.events) : null

  const message = pickMessage(error, actionError, storageError, notice)

  function submitHuman(action: ReversiAction) {
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
    <ReversiView
      board={selectReversiBoardViewModel(snapshot.state)}
      currentPlayer={currentSide}
      activeHumanSide={activeHumanSide}
      thinkingSide={thinkingSide}
      counts={counts}
      passedSide={passedSide}
      canRequestUndo={canRequestUndo}
      undoRequester={undoRequester}
      pendingUndo={pendingUndo}
      result={result}
      moveCount={snapshot.state.moveCount}
      message={message}
      onPlace={(row, col) => submitHuman({ type: 'place', row, col })}
      onRequestUndo={handleRequestUndo}
      onResolveUndo={handleResolveUndo}
      onRestart={handleRestart}
      onBackToConfig={() => navigate(gameConfigPath(GAME_ID))}
      onDismissMessage={dismissMessage}
    />
  )
}

function createBundle(): ReversiMatchBundle {
  const game = new ReversiGame()
  const fallback = (notice: string | null): ReversiMatchBundle => ({
    game,
    config: DEFAULT_REVERSI_MATCH_CONFIG,
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

  const parsedConfig = reversiMatchConfigSchema.safeParse(stored.match.config)
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
    console.error('[reversi] 存档恢复失败', error)
    return fallback('本局存档与当前规则版本不兼容，已重新开局。')
  }
}

function createSeats(config: ReversiMatchConfig): ReversiSeats {
  const players = new Map<PlayerId, MatchPlayer<ReversiObservation, ReversiAction>>()
  const humans = new Map<ReversiSide, ReversiHuman>()

  for (const seat of config.seats) {
    if (seat.type === 'human') {
      const human = new HumanController<ReversiObservation, ReversiAction>(seat.id)
      humans.set(seat.id, human)
      players.set(seat.id, { controller: human, role: 'human', undoPolicy: 'ask' })
    } else {
      assertSeatPlayable(seat)
      const ai = new ReversiHeuristicController(seat.id)
      players.set(seat.id, { controller: ai, role: 'bot', undoPolicy: 'accept' })
    }
  }

  return {
    players,
    humans,
    humanSides: new Set<ReversiSide>(humans.keys()),
  }
}

function pickMessage(
  error: Error | null,
  actionError: Error | null,
  storageError: Error | null,
  notice: string | null,
): ReversiViewMessage | null {
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