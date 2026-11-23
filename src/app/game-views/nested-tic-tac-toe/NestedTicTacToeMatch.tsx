import { useEffect, useMemo, useState } from 'react'
import { HumanController } from '@/controllers/HumanController'
import type { PlayerId } from '@/core/contracts/player'
import { GameSession } from '@/core/session/GameSession'
import { NestedTicTacToeHeuristicController } from '@/games/nested-tic-tac-toe/ai/NestedTicTacToeHeuristicController'
import {
  DEFAULT_NESTED_MATCH_CONFIG,
  createNestedTicTacToeGame,
  nestedTicTacToeMatchConfigSchema,
  type NestedTicTacToeMatchConfig,
} from '@/games/nested-tic-tac-toe/config/match-config'
import {
  NestedTicTacToeGame,
  selectCapturedCounts,
  selectEndReason,
  selectFreshMicroBoards,
  selectFreshPlacedCell,
  selectNestedTicTacToeBoardViewModel,
  type NestedTicTacToeAction,
  type NestedTicTacToeEvent,
  type NestedTicTacToeObservation,
  type NestedTicTacToeSide,
  type NestedTicTacToeState,
} from '@/games/nested-tic-tac-toe'
import { isNestedTicTacToeSide } from '@/games/nested-tic-tac-toe/domain/rules'
import { NestedTicTacToeView } from '@/games/nested-tic-tac-toe/ui/NestedTicTacToeView'
import {
  toNestedPendingUndoViewModel,
  toNestedResultViewModel,
  type NestedTicTacToeViewMessage,
} from '@/games/nested-tic-tac-toe/ui/nested-tic-tac-toe-view-model'
import { useGameMatch, type MatchPlayer } from '@/presentation/hooks/useGameMatch'
import { assertSeatPlayable } from '@/presentation/match-setup/seat-runtime'
import { gameConfigPath, useRouter } from '@/routers'
import { readStoredMatch, saveStoredMatch } from '../../match-storage'

type NestedSession = GameSession<
  NestedTicTacToeState,
  NestedTicTacToeAction,
  NestedTicTacToeObservation,
  NestedTicTacToeEvent
>
type NestedHuman = HumanController<NestedTicTacToeObservation, NestedTicTacToeAction>

const GAME_ID = 'nested-tic-tac-toe'

interface NestedMatchBundle {
  readonly game: NestedTicTacToeGame
  readonly config: NestedTicTacToeMatchConfig
  readonly initialState: NestedTicTacToeState
  readonly notice: string | null
}

interface NestedSeats {
  readonly players: ReadonlyMap<
    PlayerId,
    MatchPlayer<NestedTicTacToeObservation, NestedTicTacToeAction>
  >
  readonly humans: ReadonlyMap<NestedTicTacToeSide, NestedHuman>
  readonly humanSeats: ReadonlySet<NestedTicTacToeSide>
}

export function NestedTicTacToeMatch() {
  const { navigate } = useRouter()
  const [bundle] = useState(createBundle)
  const seats = useMemo(() => createSeats(bundle.config), [bundle.config])
  const session = useMemo<NestedSession>(
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
  const currentSide = playerId !== null && isNestedTicTacToeSide(playerId) ? playerId : null
  const activeHumanSide =
    currentSide !== null && seats.humans.has(currentSide) ? currentSide : null
  const thinkingSide =
    thinkingPlayerId !== null && isNestedTicTacToeSide(thinkingPlayerId)
      ? thinkingPlayerId
      : activeHumanSide === null && currentSide !== null
        ? currentSide
        : null

  const lastActor = snapshot.lastActor
  const undoRequester =
    snapshot.result === null &&
    snapshot.pendingUndo === null &&
    lastActor !== null &&
    isNestedTicTacToeSide(lastActor) &&
    seats.humanSeats.has(lastActor) &&
    snapshot.currentPlayer !== lastActor
      ? lastActor
      : null

  const pendingUndo =
    snapshot.pendingUndo === null
      ? null
      : toNestedPendingUndoViewModel(snapshot.pendingUndo, seats.humanSeats)
  const result =
    snapshot.result === null
      ? null
      : toNestedResultViewModel(snapshot.result, selectEndReason(snapshot.state))

  const freshCell = selectFreshPlacedCell(snapshot.lastTransition.events)
  const freshMicroBoards = selectFreshMicroBoards(snapshot.lastTransition.events)
  const message = pickMessage(error, actionError, storageError, notice)

  function submitHuman(row: number, col: number) {
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
    human.submit({ type: 'place', row, col })
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
    <NestedTicTacToeView
      board={selectNestedTicTacToeBoardViewModel(snapshot.state)}
      currentSide={currentSide}
      activeHumanSide={activeHumanSide}
      thinkingSide={thinkingSide}
      capturedCounts={selectCapturedCounts(snapshot.state)}
      canRequestUndo={undoRequester !== null}
      undoRequester={undoRequester}
      pendingUndo={pendingUndo}
      result={result}
      moveCount={snapshot.state.moveCount}
      freshCell={freshCell}
      freshMicroBoards={freshMicroBoards}
      message={message}
      onPlace={submitHuman}
      onRequestUndo={handleRequestUndo}
      onResolveUndo={handleResolveUndo}
      onRestart={handleRestart}
      onBackToConfig={() => navigate(gameConfigPath(GAME_ID))}
      onDismissMessage={dismissMessage}
    />
  )
}

function createBundle(): NestedMatchBundle {
  const game = createNestedTicTacToeGame()
  const fallback = (notice: string | null): NestedMatchBundle => ({
    game,
    config: DEFAULT_NESTED_MATCH_CONFIG,
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

  const parsedConfig = nestedTicTacToeMatchConfigSchema.safeParse(stored.match.config)
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
    console.error('[nested-tic-tac-toe] 存档恢复失败', error)
    return {
      game,
      config: parsedConfig.data,
      initialState: game.createInitialState(),
      notice: '本局存档与当前规则版本不兼容，已重新开局。',
    }
  }
}

function createSeats(config: NestedTicTacToeMatchConfig): NestedSeats {
  const players = new Map<
    PlayerId,
    MatchPlayer<NestedTicTacToeObservation, NestedTicTacToeAction>
  >()
  const humans = new Map<NestedTicTacToeSide, NestedHuman>()

  for (const seat of config.seats) {
    if (seat.type === 'human') {
      const human = new HumanController<NestedTicTacToeObservation, NestedTicTacToeAction>(
        seat.id,
      )
      humans.set(seat.id, human)
      players.set(seat.id, { controller: human, role: 'human', undoPolicy: 'ask' })
    } else {
      assertSeatPlayable(seat)
      const ai = new NestedTicTacToeHeuristicController(seat.id)
      players.set(seat.id, { controller: ai, role: 'bot', undoPolicy: 'accept' })
    }
  }

  return {
    players,
    humans,
    humanSeats: new Set(humans.keys()),
  }
}

function pickMessage(
  error: Error | null,
  actionError: Error | null,
  storageError: Error | null,
  notice: string | null,
): NestedTicTacToeViewMessage | null {
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