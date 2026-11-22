import { BaseGame } from '@/core/game/BaseGame'
import type { Transition } from '@/core/contracts/game'
import type { PlayerId } from '@/core/contracts/player'
import type { GameResult } from '@/core/contracts/result'
import { goActionSchema, goStateSchema } from './schema'
import {
  applyAction,
  createInitialState as buildInitialState,
  isGoSide,
  isLegalPlacement,
  listLegalActions,
} from './rules'
import { selectResult } from './selectors'
import type { GoAction, GoEvent, GoObservation, GoState } from './types'

export class GoGame extends BaseGame<GoState, GoAction, GoObservation, GoEvent> {
  constructor() {
    super({
      id: 'go',
      rulesVersion: 1,
      stateSchema: goStateSchema,
      actionSchema: goActionSchema,
    })
  }

  createInitialState(): GoState {
    return buildInitialState()
  }

  getCurrentPlayer(state: Readonly<GoState>): PlayerId | null {
    return state.currentPlayer
  }

  getLegalActions(state: Readonly<GoState>, playerId: PlayerId): readonly GoAction[] {
    if (!isGoSide(playerId)) {
      return []
    }
    return listLegalActions(state, playerId)
  }

  observe(state: Readonly<GoState>, _playerId: PlayerId): GoObservation {
    return {
      size: state.size,
      cells: state.cells,
      status: state.status,
      currentPlayer: state.currentPlayer,
      lastMove: state.lastMove,
      koPoint: state.koPoint,
      consecutivePasses: state.consecutivePasses,
      moveCount: state.moveCount,
    }
  }

  reduce(
    state: Readonly<GoState>,
    playerId: PlayerId,
    action: GoAction,
  ): Transition<GoState, GoEvent> {
    if (!isGoSide(playerId)) {
      throw new Error(`未知玩家：${playerId}`)
    }
    return applyAction(state, playerId, action)
  }

  getResult(state: Readonly<GoState>): GameResult | null {
    return selectResult(state)
  }

  override isActionLegal(state: Readonly<GoState>, playerId: PlayerId, action: GoAction): boolean {
    if (!isGoSide(playerId)) {
      return false
    }
    if (state.status !== 'playing' || state.currentPlayer !== playerId) {
      return false
    }
    if (action.type !== 'place') {
      return true
    }
    return isLegalPlacement(
      state.cells,
      state.size,
      action.row,
      action.col,
      playerId,
      state.koPoint,
    )
  }
}