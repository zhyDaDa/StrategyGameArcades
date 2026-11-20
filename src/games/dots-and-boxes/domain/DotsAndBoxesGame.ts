import { BaseGame } from '@/core/game/BaseGame'
import type { Transition } from '@/core/contracts/game'
import type { PlayerId } from '@/core/contracts/player'
import type { GameResult } from '@/core/contracts/result'
import { dotsAndBoxesActionSchema, dotsAndBoxesStateSchema } from './schema'
import {
  applyAction,
  createInitialState as buildInitialState,
  isDotsAndBoxesSeat,
  isEdgeDrawn,
  isEdgeInBounds,
  listLegalActions,
} from './rules'
import { selectResult } from './selectors'
import type {
  DotsAndBoxesAction,
  DotsAndBoxesEvent,
  DotsAndBoxesObservation,
  DotsAndBoxesSeat,
  DotsAndBoxesState,
  DotsEdge,
} from './types'

export interface DotsAndBoxesGameOptions {
  readonly boxSize: number
  readonly players: readonly DotsAndBoxesSeat[]
  readonly firstPlayer: DotsAndBoxesSeat
}

/**
 * 方格大战规则。棋盘尺寸与席位是本局配置的一部分，
 * 因此 Game 实例按一局的配置构造；`createInitialState` 与重开都复用它。
 */
export class DotsAndBoxesGame extends BaseGame<
  DotsAndBoxesState,
  DotsAndBoxesAction,
  DotsAndBoxesObservation,
  DotsAndBoxesEvent
> {
  private readonly options: DotsAndBoxesGameOptions

  constructor(options: DotsAndBoxesGameOptions) {
    super({
      id: 'dots-and-boxes',
      rulesVersion: 2,
      stateSchema: dotsAndBoxesStateSchema,
      actionSchema: dotsAndBoxesActionSchema,
    })
    this.options = options
  }

  createInitialState(): DotsAndBoxesState {
    return buildInitialState(this.options)
  }

  getCurrentPlayer(state: Readonly<DotsAndBoxesState>): PlayerId | null {
    return state.currentPlayer
  }

  getLegalActions(state: Readonly<DotsAndBoxesState>, playerId: PlayerId): readonly DotsAndBoxesAction[] {
    if (!isDotsAndBoxesSeat(playerId)) {
      return []
    }
    return listLegalActions(state, playerId)
  }

  observe(state: Readonly<DotsAndBoxesState>, _playerId: PlayerId): DotsAndBoxesObservation {
    return {
      boxSize: state.boxSize,
      players: state.players,
      horizontalEdges: state.horizontalEdges,
      verticalEdges: state.verticalEdges,
      boxes: state.boxes,
      currentPlayer: state.currentPlayer,
      status: state.status,
      moveCount: state.moveCount,
    }
  }

  reduce(
    state: Readonly<DotsAndBoxesState>,
    playerId: PlayerId,
    action: DotsAndBoxesAction,
  ): Transition<DotsAndBoxesState, DotsAndBoxesEvent> {
    if (!isDotsAndBoxesSeat(playerId)) {
      throw new Error(`未知玩家：${playerId}`)
    }
    return applyAction(state, playerId, action)
  }

  getResult(state: Readonly<DotsAndBoxesState>): GameResult | null {
    return selectResult(state)
  }

  override isActionLegal(
    state: Readonly<DotsAndBoxesState>,
    playerId: PlayerId,
    action: DotsAndBoxesAction,
  ): boolean {
    if (!isDotsAndBoxesSeat(playerId)) {
      return false
    }
    if (state.status !== 'playing' || state.currentPlayer !== playerId) {
      return false
    }
    const edge: DotsEdge = { orientation: action.orientation, row: action.row, col: action.col }
    if (!isEdgeInBounds(state.boxSize, edge)) {
      return false
    }
    return !isEdgeDrawn(state, edge)
  }
}