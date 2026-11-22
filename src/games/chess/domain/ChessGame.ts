import { BaseGame } from '@/core/game/BaseGame'
import type { Transition } from '@/core/contracts/game'
import type { PlayerId } from '@/core/contracts/player'
import type { GameResult } from '@/core/contracts/result'
import { chessActionSchema, chessStateSchema } from './schema'
import {
  applyAction,
  createInitialState as buildInitialState,
  isChessSide,
  listLegalActions,
} from './rules'
import { selectResult } from './selectors'
import type {
  ChessAction,
  ChessEvent,
  ChessObservation,
  ChessState,
} from './types'

export class ChessGame extends BaseGame<
  ChessState,
  ChessAction,
  ChessObservation,
  ChessEvent
> {
  constructor() {
    super({
      id: 'chess',
      rulesVersion: 1,
      stateSchema: chessStateSchema,
      actionSchema: chessActionSchema,
    })
  }

  createInitialState(): ChessState {
    return buildInitialState()
  }

  getCurrentPlayer(state: Readonly<ChessState>): PlayerId | null {
    return state.currentPlayer
  }

  getLegalActions(
    state: Readonly<ChessState>,
    playerId: PlayerId,
  ): readonly ChessAction[] {
    if (!isChessSide(playerId)) {
      return []
    }
    return listLegalActions(state, playerId)
  }

  observe(state: Readonly<ChessState>, _playerId: PlayerId): ChessObservation {
    return {
      rows: state.rows,
      cols: state.cols,
      cells: state.cells,
      castling: state.castling,
      enPassantTarget: state.enPassantTarget,
      status: state.status,
      currentPlayer: state.currentPlayer,
      lastMove: state.lastMove,
      moveCount: state.moveCount,
      halfmoveClock: state.halfmoveClock,
    }
  }

  reduce(
    state: Readonly<ChessState>,
    playerId: PlayerId,
    action: ChessAction,
  ): Transition<ChessState, ChessEvent> {
    if (!isChessSide(playerId)) {
      throw new Error(`未知玩家：${playerId}`)
    }
    return applyAction(state, playerId, action)
  }

  getResult(state: Readonly<ChessState>): GameResult | null {
    return selectResult(state)
  }

  override isActionLegal(
    state: Readonly<ChessState>,
    playerId: PlayerId,
    action: ChessAction,
  ): boolean {
    if (!isChessSide(playerId)) {
      return false
    }
    if (state.status !== 'playing' || state.currentPlayer !== playerId) {
      return false
    }
    const piece = state.cells[action.from.row * state.cols + action.from.col]
    if (piece === null || piece === undefined || piece.side !== playerId) {
      return false
    }
    const promotion = action.promotion ?? null
    return listLegalActions(state, playerId).some((legal) => {
      const legalPromotion = legal.promotion ?? null
      return (
        legal.from.row === action.from.row &&
        legal.from.col === action.from.col &&
        legal.to.row === action.to.row &&
        legal.to.col === action.to.col &&
        legalPromotion === promotion
      )
    })
  }
}