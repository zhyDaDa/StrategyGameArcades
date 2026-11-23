import type { GameResult } from '@/core/contracts/result'
import type { PendingUndo } from '@/core/session/GameSession'
import type { ChessBoardViewModel } from '../domain/selectors'
import { opponentOf } from '../domain/movement'
import { isChessSide } from '../domain/rules'
import type {
  ChessCoord,
  ChessEndReason,
  ChessPromotionType,
  ChessSide,
} from '../domain/types'
import { CHESS_SIDE_NAMES } from './chess-piece-assets'

export function sideLabel(side: ChessSide | null): string {
  return side === null ? '—' : CHESS_SIDE_NAMES[side]
}

export interface ChessResultViewModel {
  readonly outcome: 'win' | 'draw'
  readonly winner: ChessSide | null
  readonly reason: ChessEndReason | null
  readonly title: string
  readonly detail: string
}

export function toChessResultViewModel(
  result: GameResult,
  reason: ChessEndReason | null,
): ChessResultViewModel {
  if (result.outcome === 'draw') {
    return {
      outcome: 'draw',
      winner: null,
      reason,
      title: '和棋',
      detail:
        reason === 'insufficient-material'
          ? '双方子力不足以将死，按规则判和。'
          : reason === 'fifty-move-draw'
            ? '连续 50 回合没有吃子或走兵，按规则判和。'
            : reason === 'stalemate'
              ? '一方无合法着法但未被将军，逼和。'
              : '双方均无法取胜。',
    }
  }

  if (!isChessSide(result.winner)) {
    throw new Error(`国际象棋结果中的赢家不是合法的一方：${result.winner}`)
  }
  const winner = result.winner
  const loser = opponentOf(winner)
  const detail =
    reason === 'checkmate'
      ? `${CHESS_SIDE_NAMES[loser]}被将死`
      : `${CHESS_SIDE_NAMES[loser]}无法继续应战`

  return {
    outcome: 'win',
    winner,
    reason,
    title: `${CHESS_SIDE_NAMES[winner]}获胜`,
    detail,
  }
}

export interface ChessPendingUndoViewModel {
  readonly requester: ChessSide
  readonly responder: ChessSide
  readonly awaitingHuman: boolean
}

export function toChessPendingUndoViewModel(
  pending: PendingUndo,
  humanSides: ReadonlySet<ChessSide>,
): ChessPendingUndoViewModel {
  if (!isChessSide(pending.requestedBy) || !isChessSide(pending.responder)) {
    throw new Error(
      `国际象棋悔棋申请中出现非法玩家：${pending.requestedBy} -> ${pending.responder}`,
    )
  }
  return {
    requester: pending.requestedBy,
    responder: pending.responder,
    awaitingHuman: humanSides.has(pending.responder),
  }
}

export interface ChessViewMessage {
  readonly type: 'info' | 'error'
  readonly text: string
}

export interface ChessViewProps {
  readonly board: ChessBoardViewModel
  readonly currentPlayer: ChessSide | null
  readonly activeHumanSide: ChessSide | null
  readonly thinkingSide: ChessSide | null
  readonly canRequestUndo: boolean
  readonly undoRequester: ChessSide | null
  readonly pendingUndo: ChessPendingUndoViewModel | null
  readonly result: ChessResultViewModel | null
  readonly moveCount: number
  readonly message: ChessViewMessage | null
  readonly onMove: (
    from: ChessCoord,
    to: ChessCoord,
    promotion?: ChessPromotionType,
  ) => void
  readonly onRequestUndo: () => void
  readonly onResolveUndo: (accept: boolean) => void
  readonly onRestart: () => void
  readonly onBackToConfig: () => void
  readonly onDismissMessage: () => void
  /** 当前错误来自 AI 决策失败时可用：重新调用该席位控制器。 */
  readonly onRetry?: () => void
}