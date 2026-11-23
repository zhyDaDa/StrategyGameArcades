import { useEffect, useMemo, useState } from 'react'
import { buildSeatPlayers } from '@/app/match-players/buildSeatPlayers'
import type { HumanController } from '@/controllers/HumanController'
import type { PlayerId } from '@/core/contracts/player'
import { GameSession } from '@/core/session/GameSession'
import { DotsAndBoxesRandomController } from '@/games/dots-and-boxes/ai/DotsAndBoxesRandomController'
import {
  DEFAULT_DOTS_MATCH_CONFIG,
  DOTS_AND_BOXES_RULES_SUMMARY,
  createDotsAndBoxesGame,
  dotsMatchConfigSchema,
  type DotsAndBoxesMatchConfig,
} from '@/games/dots-and-boxes/config/match-config'
import {
  DotsAndBoxesGame,
  claimedBoxIndexes,
  selectClaimedBoxes,
  selectDotsBoardViewModel,
  selectFreshEdge,
  type DotsAndBoxesAction,
  type DotsAndBoxesEvent,
  type DotsAndBoxesObservation,
  type DotsAndBoxesSeat,
  type DotsAndBoxesState,
  type DotsEdge,
} from '@/games/dots-and-boxes'
import { isDotsAndBoxesSeat } from '@/games/dots-and-boxes/domain/rules'
import { DotsAndBoxesView } from '@/games/dots-and-boxes/ui/DotsAndBoxesView'
import {
  buildSeatNames,
  toDotsPendingUndoViewModel,
  toDotsPlayersViewModel,
  toDotsResultViewModel,
  type DotsViewMessage,
} from '@/games/dots-and-boxes/ui/dots-and-boxes-view-model'
import { useGameMatch, type MatchPlayer } from '@/presentation/hooks/useGameMatch'
import { gameConfigPath, useRouter } from '@/routers'
import { readStoredMatch, saveStoredMatch } from '../../match-storage'

type DotsSession = GameSession<
  DotsAndBoxesState,
  DotsAndBoxesAction,
  DotsAndBoxesObservation,
  DotsAndBoxesEvent
>
type DotsHuman = HumanController<DotsAndBoxesObservation, DotsAndBoxesAction>

const GAME_ID = 'dots-and-boxes'

interface DotsMatchBundle {
  readonly game: DotsAndBoxesGame
  readonly config: DotsAndBoxesMatchConfig
  readonly initialState: DotsAndBoxesState
  readonly notice: string | null
}

interface DotsSeats {
  readonly players: ReadonlyMap<PlayerId, MatchPlayer<DotsAndBoxesObservation, DotsAndBoxesAction>>
  readonly humans: ReadonlyMap<DotsAndBoxesSeat, DotsHuman>
  readonly humanSeats: ReadonlySet<DotsAndBoxesSeat>
  readonly names: Record<DotsAndBoxesSeat, string>
}

export function DotsAndBoxesMatch() {
  const { navigate } = useRouter()
  const [bundle] = useState(createBundle)
  const seats = useMemo(() => createSeats(bundle.game, bundle.config), [bundle])
  const session = useMemo<DotsSession>(
    () => new GameSession(bundle.game, { initialState: bundle.initialState }),
    [bundle],
  )
  const { snapshot, error, thinkingPlayerId, clearError, retry } = useGameMatch({
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 清除上一次 localStorage 写入错误
      setStorageError(null)
    } catch (err) {
      setStorageError(toError(err))
    }
  }, [bundle, snapshot.state, snapshot.version])

  const currentSeat =
    snapshot.currentPlayer !== null && isDotsAndBoxesSeat(snapshot.currentPlayer)
      ? snapshot.currentPlayer
      : null
  const thinkingSeat =
    thinkingPlayerId !== null && isDotsAndBoxesSeat(thinkingPlayerId) ? thinkingPlayerId : null
  const interactive =
    currentSeat !== null &&
    seats.humanSeats.has(currentSeat) &&
    snapshot.result === null &&
    snapshot.pendingUndo === null

  const lastActor = snapshot.lastActor
  const undoRequester =
    snapshot.result === null &&
    snapshot.pendingUndo === null &&
    lastActor !== null &&
    isDotsAndBoxesSeat(lastActor) &&
    seats.humanSeats.has(lastActor) &&
    snapshot.currentPlayer !== lastActor
      ? lastActor
      : null

  const pendingUndo =
    snapshot.pendingUndo === null
      ? null
      : toDotsPendingUndoViewModel(snapshot.pendingUndo, seats.humanSeats, seats.names)

  const claimed = selectClaimedBoxes(snapshot.lastTransition.events)
  const freshClaims = claimedBoxIndexes(snapshot.state.boxSize, claimed)
  const freshEdge = selectFreshEdge(snapshot.lastTransition.events)
  const pulseSeat = claimed.length > 0 ? claimed[0].seat : null

  const players = toDotsPlayersViewModel({
    state: snapshot.state,
    names: seats.names,
    thinkingSeat,
    pulseSeat,
    pulseVersion: snapshot.version,
  })
  const result =
    snapshot.result === null ? null : toDotsResultViewModel(snapshot.state, seats.names)

  const message = pickMessage(error, actionError, storageError, notice)

  function submitHuman(edge: DotsEdge) {
    if (currentSeat === null || !seats.humanSeats.has(currentSeat)) {
      return
    }
    if (snapshot.result !== null || snapshot.pendingUndo !== null) {
      return
    }
    const human = seats.humans.get(currentSeat)
    if (human === undefined) {
      return
    }
    human.submit({
      type: 'draw-edge',
      orientation: edge.orientation,
      row: edge.row,
      col: edge.col,
    })
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
    <DotsAndBoxesView
      board={selectDotsBoardViewModel(snapshot.state)}
      players={players}
      freshEdge={freshEdge}
      drawVersion={snapshot.version}
      interactive={interactive}
      freshClaims={freshClaims}
      canRequestUndo={undoRequester !== null}
      undoRequester={undoRequester}
      pendingUndo={pendingUndo}
      result={result}
      message={message}
      onDrawEdge={submitHuman}
      onRequestUndo={handleRequestUndo}
      onResolveUndo={handleResolveUndo}
      onRestart={handleRestart}
      onBackToConfig={() => navigate(gameConfigPath(GAME_ID))}
      onDismissMessage={dismissMessage}
      onRetry={error !== null ? retry : undefined}
    />
  )
}

function createBundle(): DotsMatchBundle {
  const stored = readStoredMatch(GAME_ID)
  if (!stored.ok) {
    return createFallback(stored.reason === 'invalid' ? '本局快照无法读取，已使用默认配置重新开局。' : null)
  }

  const parsedConfig = dotsMatchConfigSchema.safeParse(stored.match.config)
  if (!parsedConfig.success) {
    return createFallback('本局配置无法识别，已使用默认配置重新开局。')
  }

  const config = parsedConfig.data
  const game = createDotsAndBoxesGame(config)
  try {
    const initialState = game.restore(stored.match.save)
    if (!matchesConfig(initialState, config)) {
      throw new Error('存档中的席位或棋盘尺寸与本局配置不一致')
    }
    return { game, config, initialState, notice: null }
  } catch (error) {
    console.error('[dots-and-boxes] 存档恢复失败', error)
    return {
      game,
      config,
      initialState: game.createInitialState(),
      notice: '本局存档与当前规则版本不兼容，已重新开局。',
    }
  }
}

function createFallback(notice: string | null): DotsMatchBundle {
  const config = DEFAULT_DOTS_MATCH_CONFIG
  const game = createDotsAndBoxesGame(config)
  return { game, config, initialState: game.createInitialState(), notice }
}

function matchesConfig(
  state: Readonly<DotsAndBoxesState>,
  config: DotsAndBoxesMatchConfig,
): boolean {
  return (
    state.boxSize === config.boxSize &&
    state.players.length === config.seats.length &&
    state.players.every((seat, index) => seat === config.seats[index].id)
  )
}

function createSeats(
  game: DotsAndBoxesGame,
  config: DotsAndBoxesMatchConfig,
): DotsSeats {
  const built = buildSeatPlayers(config, {
    gameId: GAME_ID,
    gameName: '方格大战',
    rulesSummary: DOTS_AND_BOXES_RULES_SUMMARY,
    parseAction: (raw) => game.parseAction(raw),
    createAlgorithm: (id) => new DotsAndBoxesRandomController(id),
  })
  return {
    players: built.players,
    humans: built.humans,
    humanSeats: new Set<DotsAndBoxesSeat>(built.humans.keys()),
    names: buildSeatNames(config.seats, config.youSeat),
  }
}

function pickMessage(
  error: Error | null,
  actionError: Error | null,
  storageError: Error | null,
  notice: string | null,
): DotsViewMessage | null {
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