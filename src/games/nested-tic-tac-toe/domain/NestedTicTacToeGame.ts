import { BaseGame } from '@/core/game/BaseGame'
import type { Transition } from '@/core/contracts/game'
import type { PlayerId } from '@/core/contracts/player'
import type { GameResult } from '@/core/contracts/result'
import { nestedTicTacToeActionSchema, nestedTicTacToeStateSchema } from './schema'
import {
  applyAction,
  createInitialState as buildInitialState,
  isLegalMove,
  isNestedTicTacToeSide,
  listLegalActions,
} from './rules'
import { selectResult } from './selectors'
import type {
  NestedTicTacToeAction,
  NestedTicTacToeEvent,
  NestedTicTacToeObservation,
  NestedTicTacToeState,
} from './types'

export class NestedTicTacToeGame extends BaseGame<
  NestedTicTacToeState,
  NestedTicTacToeAction,
  NestedTicTacToeObservation,
  NestedTicTacToeEvent
> {
  constructor() {
    super({
      id: 'nested-tic-tac-toe',
      rulesVersion: 2,
      stateSchema: nestedTicTacToeStateSchema,
      actionSchema: nestedTicTacToeActionSchema,
    })
  }

  createInitialState(): NestedTicTacToeState {
    return buildInitialState()
  }

  getCurrentPlayer(state: Readonly<NestedTicTacToeState>): PlayerId | null {
    return state.currentPlayer
  }

  getLegalActions(
    state: Readonly<NestedTicTacToeState>,
    playerId: PlayerId,
  ): readonly NestedTicTacToeAction[] {
    if (!isNestedTicTacToeSide(playerId)) {
      return []
    }
    return listLegalActions(state, playerId)
  }

  observe(
    state: Readonly<NestedTicTacToeState>,
    _playerId: PlayerId,
  ): NestedTicTacToeObservation {
    return {
      cells: state.cells,
      currentPlayer: state.currentPlayer,
      lastMove: state.lastMove,
      status: state.status,
      moveCount: state.moveCount,
    }
  }

  reduce(
    state: Readonly<NestedTicTacToeState>,
    playerId: PlayerId,
    action: NestedTicTacToeAction,
  ): Transition<NestedTicTacToeState, NestedTicTacToeEvent> {
    if (!isNestedTicTacToeSide(playerId)) {
      throw new Error(`未知玩家：${playerId}`)
    }
    return applyAction(state, playerId, action)
  }

  getResult(state: Readonly<NestedTicTacToeState>): GameResult | null {
    return selectResult(state)
  }

  override isActionLegal(
    state: Readonly<NestedTicTacToeState>,
    playerId: PlayerId,
    action: NestedTicTacToeAction,
  ): boolean {
    if (!isNestedTicTacToeSide(playerId)) {
      return false
    }
    if (state.status !== 'playing' || state.currentPlayer !== playerId) {
      return false
    }
    return isLegalMove(state, action)
  }
}