import { useEffect, useMemo, useState } from 'react'
import { buildSeatPlayers } from '@/app/match-players/buildSeatPlayers'
import type { HumanController } from '@/controllers/HumanController'
import type { PlayerId } from '@/core/contracts/player'
import { GameSession } from '@/core/session/GameSession'
import { ChessHeuristicController } from '@/games/chess/ai/ChessHeuristicController'
import {
  CHESS_RULES_SUMMARY,
  DEFAULT_CHESS_MATCH_CONFIG,
  chessMatchConfigSchema,
  type ChessMatchConfig,
} from '@/games/chess/config/match-config'
import {
  ChessGame,
  selectChessBoardViewModel,
  type ChessAction,
  type ChessEvent,
  type ChessObservation,
  type ChessPromotionType,
  type ChessSide,
  type ChessState,
} from '@/games/chess'
import { isChessSide } from '@/games/chess/domain/rules'
import { ChessView } from '@/games/chess/ui/ChessView'
import {
  toChessPendingUndoViewModel,
  toChessResultViewModel,
  type ChessViewMessage,
} from '@/games/chess/ui/chess-view-model'
import { useGameMatch, type MatchPlayer } from '@/presentation/hooks/useGameMatch'
import { gameConfigPath, useRouter } from '@/routers'
import { readStoredMatch, saveStoredMatch } from '../../match-storage'

type ChessSession = GameSession<ChessState, ChessAction, ChessObservation, ChessEvent>
type ChessHuman = HumanController<ChessObservation, ChessAction>

const GAME_ID = 'chess'

interface ChessMatchBundle {
  readonly game: ChessGame
  readonly config: ChessMatchConfig
  readonly initialState: ChessState
  readonly notice: string | null
}

interface ChessSeats {
  readonly players: ReadonlyMap<PlayerId, MatchPlayer<ChessObservation, ChessAction>>
  readonly humans: ReadonlyMap<ChessSide, ChessHuman>
  readonly humanSides: ReadonlySet<ChessSide>
}

export function ChessMatch() {
  const { navigate } = useRouter()
  const [bundle] = useState(createBundle)
  const seats = useMemo(() => createSeats(bundle.game, bundle.config), [bundle])
  const session = useMemo<ChessSession>(
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

  const playerId = snapshot.currentPlayer
  const currentSide = playerId !== null && isChessSide(playerId) ? playerId : null
  const activeHumanSide =
    currentSide !== null && seats.humans.has(currentSide) ? currentSide : null
  const thinkingSide =
    thinkingPlayerId !== null && isChessSide(thinkingPlayerId)
      ? thinkingPlayerId
      : activeHumanSide === null && currentSide !== null
        ? currentSide
        : null

  const lastActor = snapshot.lastActor
  const undoRequester =
    snapshot.result === null &&
    snapshot.pendingUndo === null &&
    lastActor !== null &&
    isChessSide(lastActor) &&
    seats.humans.has(lastActor)
      ? lastActor
      : null
  const canRequestUndo = undoRequester !== null

  const pendingUndo =
    snapshot.pendingUndo === null
      ? null
      : toChessPendingUndoViewModel(snapshot.pendingUndo, seats.humanSides)
  const result =
    snapshot.result === null
      ? null
      : toChessResultViewModel(snapshot.result, snapshot.state.endReason)
  const board = selectChessBoardViewModel(snapshot.state)

  const message = pickMessage(error, actionError, storageError, notice)

  function submitHuman(
    from: { row: number; col: number },
    to: { row: number; col: number },
    promotion?: ChessPromotionType,
  ) {
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
    const action: ChessAction =
      promotion === undefined
        ? { type: 'move', from, to }
        : { type: 'move', from, to, promotion }
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
    <ChessView
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
      onMove={submitHuman}
      onRequestUndo={handleRequestUndo}
      onResolveUndo={handleResolveUndo}
      onRestart={handleRestart}
      onBackToConfig={() => navigate(gameConfigPath(GAME_ID))}
      onDismissMessage={dismissMessage}
      onRetry={error !== null ? retry : undefined}
    />
  )
}

function createBundle(): ChessMatchBundle {
  const game = new ChessGame()
  const fallback = (notice: string | null): ChessMatchBundle => ({
    game,
    config: DEFAULT_CHESS_MATCH_CONFIG,
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

  const parsedConfig = chessMatchConfigSchema.safeParse(stored.match.config)
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
    console.error('[chess] 存档恢复失败', error)
    return fallback('本局存档与当前规则版本不兼容，已重新开局。')
  }
}

function createSeats(game: ChessGame, config: ChessMatchConfig): ChessSeats {
  const built = buildSeatPlayers(config, {
    gameId: GAME_ID,
    gameName: '国际象棋',
    rulesSummary: CHESS_RULES_SUMMARY,
    parseAction: (raw) => game.parseAction(raw),
    createAlgorithm: (id) => new ChessHeuristicController(id),
  })
  return {
    players: built.players,
    humans: built.humans,
    humanSides: new Set<ChessSide>(built.humans.keys()),
  }
}

function pickMessage(
  error: Error | null,
  actionError: Error | null,
  storageError: Error | null,
  notice: string | null,
): ChessViewMessage | null {
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