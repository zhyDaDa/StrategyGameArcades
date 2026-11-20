import { BaseGame } from '@/core/game/BaseGame'
import type { Transition } from '@/core/contracts/game'
import type { PlayerId } from '@/core/contracts/player'
import type { GameResult } from '@/core/contracts/result'
import { gomokuActionSchema, gomokuStateSchema } from './schema'
import {
  applyAction,
  createInitialState as buildInitialState,
  isCellEmpty,
  isGomokuSide,
  listLegalActions,
} from './rules'
import { selectResult } from './selectors'
import type { GomokuAction, GomokuEvent, GomokuObservation, GomokuState } from './types'

export class GomokuGame extends BaseGame<GomokuState, GomokuAction, GomokuObservation, GomokuEvent> {
  constructor() {
    super({
      id: 'gomoku',
      rulesVersion: 1,
      stateSchema: gomokuStateSchema,
      actionSchema: gomokuActionSchema,
    })
  }

  createInitialState(): GomokuState {
    return buildInitialState()
  }

  getCurrentPlayer(state: Readonly<GomokuState>): PlayerId | null {
    return state.currentPlayer
  }

  getLegalActions(state: Readonly<GomokuState>, playerId: PlayerId): readonly GomokuAction[] {
    if (!isGomokuSide(playerId)) {
      return []
    }
    return listLegalActions(state, playerId)
  }

  observe(state: Readonly<GomokuState>, _playerId: PlayerId): GomokuObservation {
    return {
      size: state.size,
      cells: state.cells,
      status: state.status,
      currentPlayer: state.currentPlayer,
      lastMove: state.lastMove,
      moveCount: state.moveCount,
    }
  }

  reduce(
    state: Readonly<GomokuState>,
    playerId: PlayerId,
    action: GomokuAction,
  ): Transition<GomokuState, GomokuEvent> {
    if (!isGomokuSide(playerId)) {
      throw new Error(`未知玩家：${playerId}`)
    }
    return applyAction(state, playerId, action)
  }

  getResult(state: Readonly<GomokuState>): GameResult | null {
    return selectResult(state)
  }

  override isActionLegal(state: Readonly<GomokuState>, playerId: PlayerId, action: GomokuAction): boolean {
    if (!isGomokuSide(playerId)) {
      return false
    }
    if (state.status !== 'playing' || state.currentPlayer !== playerId) {
      return false
    }
    if (action.type === 'resign') {
      return true
    }
    return isCellEmpty(state.cells, state.size, action.row, action.col)
  }
}