import bB from '@/assets/chess/bB.svg'
import bK from '@/assets/chess/bK.svg'
import bN from '@/assets/chess/bN.svg'
import bP from '@/assets/chess/bP.svg'
import bQ from '@/assets/chess/bQ.svg'
import bR from '@/assets/chess/bR.svg'
import wB from '@/assets/chess/wB.svg'
import wK from '@/assets/chess/wK.svg'
import wN from '@/assets/chess/wN.svg'
import wP from '@/assets/chess/wP.svg'
import wQ from '@/assets/chess/wQ.svg'
import wR from '@/assets/chess/wR.svg'
import type { ChessPiece, ChessPieceType, ChessSide } from '../domain/types'

/** 棋子 SVG 资源表；白黑两套文件名遵循 b/w + 类型首字母。 */
export const CHESS_PIECE_ASSETS: Record<ChessSide, Record<ChessPieceType, string>> = {
  white: {
    king: wK,
    queen: wQ,
    rook: wR,
    bishop: wB,
    knight: wN,
    pawn: wP,
  },
  black: {
    king: bK,
    queen: bQ,
    rook: bR,
    bishop: bB,
    knight: bN,
    pawn: bP,
  },
}

export const CHESS_PIECE_NAMES: Record<ChessPieceType, string> = {
  king: '王',
  queen: '后',
  rook: '车',
  bishop: '象',
  knight: '马',
  pawn: '兵',
}

export const CHESS_SIDE_NAMES: Record<ChessSide, string> = {
  white: '白方',
  black: '黑方',
}

export function chessPieceAsset(piece: ChessPiece): string {
  return CHESS_PIECE_ASSETS[piece.side][piece.type]
}

export function chessPieceLabel(piece: ChessPiece): string {
  return `${CHESS_SIDE_NAMES[piece.side]}${CHESS_PIECE_NAMES[piece.type]}`
}