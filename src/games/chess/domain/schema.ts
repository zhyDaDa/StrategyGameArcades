import { z } from 'zod'
import {
  CHESS_CASTLE_SIDES,
  CHESS_COLS,
  CHESS_END_REASONS,
  CHESS_PIECE_TYPES,
  CHESS_PROMOTION_TYPES,
  CHESS_ROWS,
  CHESS_SIDES,
} from './types'

const coordSchema = z.object({
  row: z.number().int().min(0).max(CHESS_ROWS - 1),
  col: z.number().int().min(0).max(CHESS_COLS - 1),
})

const pieceSchema = z.object({
  side: z.enum(CHESS_SIDES),
  type: z.enum(CHESS_PIECE_TYPES),
})

const castlingRightsSchema = z.object({
  kingSide: z.boolean(),
  queenSide: z.boolean(),
})

const castlingSchema = z.object({
  white: castlingRightsSchema,
  black: castlingRightsSchema,
})

export const chessActionSchema = z.object({
  type: z.literal('move'),
  from: coordSchema,
  to: coordSchema,
  promotion: z.enum(CHESS_PROMOTION_TYPES).nullable().optional(),
})

export const chessStateSchema = z.object({
  rows: z.literal(CHESS_ROWS),
  cols: z.literal(CHESS_COLS),
  cells: z.array(pieceSchema.nullable()).length(CHESS_ROWS * CHESS_COLS),
  castling: castlingSchema,
  enPassantTarget: coordSchema.nullable(),
  status: z.enum(['playing', 'completed']),
  currentPlayer: z.enum(CHESS_SIDES).nullable(),
  winner: z.enum(CHESS_SIDES).nullable(),
  endReason: z.enum(CHESS_END_REASONS).nullable(),
  lastMove: z
    .object({
      from: coordSchema,
      to: coordSchema,
      piece: pieceSchema,
      captured: pieceSchema.nullable(),
      promotion: z.enum(CHESS_PROMOTION_TYPES).nullable(),
      castleSide: z.enum(CHESS_CASTLE_SIDES).nullable(),
      enPassant: z.boolean(),
    })
    .nullable(),
  moveCount: z.number().int().min(0),
  halfmoveClock: z.number().int().min(0),
})