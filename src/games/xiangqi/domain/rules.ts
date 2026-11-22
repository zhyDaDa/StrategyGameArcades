import type { Transition } from '@/core/contracts/game'
import {
  applyMoveToCells,
  generateLegalMoves,
  indexOf,
  isInCheck,
  opponentOf,
  sameCoord,
} from './movement'
import {
  XIANGQI_COLS,
  XIANGQI_NO_CAPTURE_PLIES,
  XIANGQI_ROWS,
  type XiangqiAction,
  type XiangqiEvent,
  type XiangqiPiece,
  type XiangqiPieceType,
  type XiangqiSide,
  type XiangqiState,
} from './types'

const BACK_RANK: readonly XiangqiPieceType[] = [
  'chariot',
  'horse',
  'elephant',
  'advisor',
  'general',
  'advisor',
  'elephant',
  'horse',
  'chariot',
]

const CANNON_COLS = [1, 7] as const
const SOLDIER_COLS = [0, 2, 4, 6, 8] as const

export function isXiangqiSide(value: string): value is XiangqiSide {
  return value === 'red' || value === 'black'
}

export function createInitialState(): XiangqiState {
  const cells = Array<XiangqiPiece | null>(XIANGQI_ROWS * XIANGQI_COLS).fill(null)

  for (let col = 0; col < XIANGQI_COLS; col += 1) {
    const type = BACK_RANK[col]
    if (type === undefined) {
      throw new Error(`中国象棋初始布局缺少第 ${col} 列的后排棋子`)
    }
    cells[indexOf(XIANGQI_COLS, 0, col)] = { side: 'black', type }
    cells[indexOf(XIANGQI_COLS, 9, col)] = { side: 'red', type }
  }
  for (const col of CANNON_COLS) {
    cells[indexOf(XIANGQI_COLS, 2, col)] = { side: 'black', type: 'cannon' }
    cells[indexOf(XIANGQI_COLS, 7, col)] = { side: 'red', type: 'cannon' }
  }
  for (const col of SOLDIER_COLS) {
    cells[indexOf(XIANGQI_COLS, 3, col)] = { side: 'black', type: 'soldier' }
    cells[indexOf(XIANGQI_COLS, 6, col)] = { side: 'red', type: 'soldier' }
  }

  return {
    rows: XIANGQI_ROWS,
    cols: XIANGQI_COLS,
    cells,
    status: 'playing',
    currentPlayer: 'red',
    winner: null,
    endReason: null,
    lastMove: null,
    moveCount: 0,
    noCapturePlies: 0,
  }
}

export function listLegalActions(
  state: Readonly<XiangqiState>,
  side: XiangqiSide,
): readonly XiangqiAction[] {
  if (state.status !== 'playing' || state.currentPlayer !== side) {
    return []
  }
  return generateLegalMoves(state.cells, state.rows, state.cols, side).map(({ from, to }) => ({
    type: 'move',
    from,
    to,
  }))
}

export function applyAction(
  state: Readonly<XiangqiState>,
  side: XiangqiSide,
  action: XiangqiAction,
): Transition<XiangqiState, XiangqiEvent> {
  if (state.status !== 'playing' || state.currentPlayer !== side) {
    throw new Error('非法状态：对局未进行或非当前玩家')
  }

  const legal = generateLegalMoves(state.cells, state.rows, state.cols, side)
  if (!legal.some((move) => sameCoord(move.from, action.from) && sameCoord(move.to, action.to))) {
    throw new Error('非法走法：该棋子在当前局面不能走到目标点')
  }

  const { cells, moved, captured } = applyMoveToCells(
    state.cells,
    state.cols,
    action.from,
    action.to,
  )
  const events: XiangqiEvent[] = [
    { type: 'piece.moved', playerId: side, from: action.from, to: action.to, moved, captured },
  ]

  const opponent = opponentOf(side)
  const opponentInCheck = isInCheck(cells, state.rows, state.cols, opponent)
  const opponentHasMove =
    generateLegalMoves(cells, state.rows, state.cols, opponent).length > 0
  const noCapturePlies = captured === null ? state.noCapturePlies + 1 : 0
  const lastMove = { from: action.from, to: action.to, captured }

  if (!opponentHasMove) {
    const reason = opponentInCheck ? 'checkmate' : 'stalemate'
    events.push({
      type: 'game.finished',
      result: { outcome: 'win', winner: side },
      reason,
    })
    return {
      state: {
        ...state,
        cells,
        status: 'completed',
        currentPlayer: null,
        winner: side,
        endReason: reason,
        lastMove,
        moveCount: state.moveCount + 1,
        noCapturePlies,
      },
      events,
    }
  }

  if (noCapturePlies >= XIANGQI_NO_CAPTURE_PLIES) {
    events.push({
      type: 'game.finished',
      result: { outcome: 'draw' },
      reason: 'no-capture-draw',
    })
    return {
      state: {
        ...state,
        cells,
        status: 'completed',
        currentPlayer: null,
        winner: null,
        endReason: 'no-capture-draw',
        lastMove,
        moveCount: state.moveCount + 1,
        noCapturePlies,
      },
      events,
    }
  }

  if (opponentInCheck) {
    events.push({ type: 'check.given', playerId: side, checkedPlayerId: opponent })
  }

  return {
    state: {
      ...state,
      cells,
      status: 'playing',
      currentPlayer: opponent,
      winner: null,
      endReason: null,
      lastMove,
      moveCount: state.moveCount + 1,
      noCapturePlies,
    },
    events,
  }
}