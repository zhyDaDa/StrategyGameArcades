import { useEffect, useMemo, useState } from 'react'
import { HumanController } from '@/controllers/HumanController'
import type { PlayerId } from '@/core/contracts/player'
import { GameSession } from '@/core/session/GameSession'
import { GoHeuristicController } from '@/games/go/ai/GoHeuristicController'
import {
  DEFAULT_GO_MATCH_CONFIG,
  goMatchConfigSchema,
  type GoMatchConfig,
} from '@/games/go/config/match-config'
import {
  GoGame,
  selectCaptures,
  selectGoBoardViewModel,
  selectScore,
  type GoAction,
  type GoEvent,
  type GoObservation,
  type GoSide,
  type GoState,
} from '@/games/go'
import { isGoSide } from '@/games/go/domain/rules'
import { GoView } from '@/games/go/ui/GoView'
import {
  selectPassedSide,
  toGoPendingUndoViewModel,
  toGoResultViewModel,
  type GoViewMessage,
} from '@/games/go/ui/go-view-model'
import { useGameMatch, type MatchPlayer } from '@/presentation/hooks/useGameMatch'
import { assertSeatPlayable } from '@/presentation/match-setup/seat-runtime'
import { gameConfigPath, useRouter } from '@/routers'
import { readStoredMatch, saveStoredMatch } from '../../match-storage'

type GoSession = GameSession<GoState, GoAction, GoObservation, GoEvent>
type GoHuman = HumanController<GoObservation, GoAction>

const GAME_ID = 'go'

interface GoMatchBundle {
  readonly game: GoGame
  readonly config: GoMatchConfig
  readonly initialState: GoState
  readonly notice: string | null
}

interface GoSeats {
  readonly players: ReadonlyMap<PlayerId, MatchPlayer<GoObservation, GoAction>>
  readonly humans: ReadonlyMap<GoSide, GoHuman>
  readonly humanSides: ReadonlySet<GoSide>
}

export function GoMatch() {
  const { navigate } = useRouter()
  const [bundle] = useState(createBundle)
  const seats = useMemo(() => createSeats(bundle.config), [bundle.config])
  const session = useMemo<GoSession>(
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
  const currentSide = playerId !== null && isGoSide(playerId) ? playerId : null
  const activeHumanSide =
    currentSide !== null && seats.humans.has(currentSide) ? currentSide : null
  const thinkingSide =
    thinkingPlayerId !== null && isGoSide(thinkingPlayerId)
      ? thinkingPlayerId
      : activeHumanSide === null && currentSide !== null
        ? currentSide
        : null

  const lastActor = snapshot.lastActor
  const undoRequester =
    snapshot.result === null &&
    snapshot.pendingUndo === null &&
    lastActor !== null &&
    isGoSide(lastActor) &&
    seats.humans.has(lastActor)
      ? lastActor
      : null
  const canRequestUndo = undoRequester !== null

  const pendingUndo =
    snapshot.pendingUndo === null
      ? null
      : toGoPendingUndoViewModel(snapshot.pendingUndo, seats.humanSides)
  const captures = selectCaptures(snapshot.state)
  const score = selectScore(snapshot.state)
  const result =
    snapshot.result === null
      ? null
      : toGoResultViewModel(snapshot.result, snapshot.state.endReason, score)
  const passedSide =
    snapshot.result === null ? selectPassedSide(snapshot.lastTransition.events) : null

  const message = pickMessage(error, actionError, storageError, notice)

  function submitHuman(action: GoAction) {
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
    <GoView
      board={selectGoBoardViewModel(snapshot.state)}
      currentPlayer={currentSide}
      activeHumanSide={activeHumanSide}
      thinkingSide={thinkingSide}
      captures={captures}
      passedSide={passedSide}
      canRequestUndo={canRequestUndo}
      undoRequester={undoRequester}
      pendingUndo={pendingUndo}
      result={result}
      moveCount={snapshot.state.moveCount}
      message={message}
      onPlace={(row, col) => submitHuman({ type: 'place', row, col })}
      onPass={() => submitHuman({ type: 'pass' })}
      onResign={() => submitHuman({ type: 'resign' })}
      onRequestUndo={handleRequestUndo}
      onResolveUndo={handleResolveUndo}
      onRestart={handleRestart}
      onBackToConfig={() => navigate(gameConfigPath(GAME_ID))}
      onDismissMessage={dismissMessage}
    />
  )
}

function createBundle(): GoMatchBundle {
  const game = new GoGame()
  const fallback = (notice: string | null): GoMatchBundle => ({
    game,
    config: DEFAULT_GO_MATCH_CONFIG,
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

  const parsedConfig = goMatchConfigSchema.safeParse(stored.match.config)
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
    console.error('[go] 存档恢复失败', error)
    return fallback('本局存档与当前规则版本不兼容，已重新开局。')
  }
}

function createSeats(config: GoMatchConfig): GoSeats {
  const players = new Map<PlayerId, MatchPlayer<GoObservation, GoAction>>()
  const humans = new Map<GoSide, GoHuman>()

  for (const seat of config.seats) {
    if (seat.type === 'human') {
      const human = new HumanController<GoObservation, GoAction>(seat.id)
      humans.set(seat.id, human)
      players.set(seat.id, { controller: human, role: 'human', undoPolicy: 'ask' })
    } else {
      assertSeatPlayable(seat)
      const ai = new GoHeuristicController(seat.id)
      players.set(seat.id, { controller: ai, role: 'bot', undoPolicy: 'accept' })
    }
  }

  return {
    players,
    humans,
    humanSides: new Set<GoSide>(humans.keys()),
  }
}

function pickMessage(
  error: Error | null,
  actionError: Error | null,
  storageError: Error | null,
  notice: string | null,
): GoViewMessage | null {
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