import { BaseGame } from '@/core/game/BaseGame'
import type { Transition } from '@/core/contracts/game'
import type { PlayerId } from '@/core/contracts/player'
import type { GameResult } from '@/core/contracts/result'
import { reversiActionSchema, reversiStateSchema } from './schema'
import {
  applyAction,
  createInitialState as buildInitialState,
  isLegalMove,
  isReversiSide,
  listLegalActions,
} from './rules'
import { selectResult } from './selectors'
import type { ReversiAction, ReversiEvent, ReversiObservation, ReversiState } from './types'

export class ReversiGame extends BaseGame<ReversiState, ReversiAction, ReversiObservation, ReversiEvent> {
  constructor() {
    super({
      id: 'reversi',
      rulesVersion: 2,
      stateSchema: reversiStateSchema,
      actionSchema: reversiActionSchema,
    })
  }

  createInitialState(): ReversiState {
    return buildInitialState()
  }

  getCurrentPlayer(state: Readonly<ReversiState>): PlayerId | null {
    return state.currentPlayer
  }

  getLegalActions(state: Readonly<ReversiState>, playerId: PlayerId): readonly ReversiAction[] {
    if (!isReversiSide(playerId)) {
      return []
    }
    return listLegalActions(state, playerId)
  }

  observe(state: Readonly<ReversiState>, _playerId: PlayerId): ReversiObservation {
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
    state: Readonly<ReversiState>,
    playerId: PlayerId,
    action: ReversiAction,
  ): Transition<ReversiState, ReversiEvent> {
    if (!isReversiSide(playerId)) {
      throw new Error(`未知玩家：${playerId}`)
    }
    return applyAction(state, playerId, action)
  }

  getResult(state: Readonly<ReversiState>): GameResult | null {
    return selectResult(state)
  }

  override isActionLegal(state: Readonly<ReversiState>, playerId: PlayerId, action: ReversiAction): boolean {
    if (!isReversiSide(playerId)) {
      return false
    }
    if (state.status !== 'playing' || state.currentPlayer !== playerId) {
      return false
    }
    return isLegalMove(state.cells, state.size, action.row, action.col, playerId)
  }
}