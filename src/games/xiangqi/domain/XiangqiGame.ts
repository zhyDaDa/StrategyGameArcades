import { BaseGame } from '@/core/game/BaseGame'
import type { Transition } from '@/core/contracts/game'
import type { PlayerId } from '@/core/contracts/player'
import type { GameResult } from '@/core/contracts/result'
import { xiangqiActionSchema, xiangqiStateSchema } from './schema'
import {
  applyAction,
  createInitialState as buildInitialState,
  isXiangqiSide,
  listLegalActions,
} from './rules'
import { selectResult } from './selectors'
import type {
  XiangqiAction,
  XiangqiEvent,
  XiangqiObservation,
  XiangqiState,
} from './types'

export class XiangqiGame extends BaseGame<
  XiangqiState,
  XiangqiAction,
  XiangqiObservation,
  XiangqiEvent
> {
  constructor() {
    super({
      id: 'xiangqi',
      rulesVersion: 1,
      stateSchema: xiangqiStateSchema,
      actionSchema: xiangqiActionSchema,
    })
  }

  createInitialState(): XiangqiState {
    return buildInitialState()
  }

  getCurrentPlayer(state: Readonly<XiangqiState>): PlayerId | null {
    return state.currentPlayer
  }

  getLegalActions(
    state: Readonly<XiangqiState>,
    playerId: PlayerId,
  ): readonly XiangqiAction[] {
    if (!isXiangqiSide(playerId)) {
      return []
    }
    return listLegalActions(state, playerId)
  }

  observe(state: Readonly<XiangqiState>, _playerId: PlayerId): XiangqiObservation {
    return {
      rows: state.rows,
      cols: state.cols,
      cells: state.cells,
      status: state.status,
      currentPlayer: state.currentPlayer,
      lastMove: state.lastMove,
      moveCount: state.moveCount,
      noCapturePlies: state.noCapturePlies,
    }
  }

  reduce(
    state: Readonly<XiangqiState>,
    playerId: PlayerId,
    action: XiangqiAction,
  ): Transition<XiangqiState, XiangqiEvent> {
    if (!isXiangqiSide(playerId)) {
      throw new Error(`未知玩家：${playerId}`)
    }
    return applyAction(state, playerId, action)
  }

  getResult(state: Readonly<XiangqiState>): GameResult | null {
    return selectResult(state)
  }

  override isActionLegal(
    state: Readonly<XiangqiState>,
    playerId: PlayerId,
    action: XiangqiAction,
  ): boolean {
    if (!isXiangqiSide(playerId)) {
      return false
    }
    if (state.status !== 'playing' || state.currentPlayer !== playerId) {
      return false
    }
    const piece = state.cells[action.from.row * state.cols + action.from.col]
    if (piece === null || piece === undefined || piece.side !== playerId) {
      return false
    }
    return listLegalActions(state, playerId).some(
      (legal) =>
        legal.from.row === action.from.row &&
        legal.from.col === action.from.col &&
        legal.to.row === action.to.row &&
        legal.to.col === action.to.col,
    )
  }
}