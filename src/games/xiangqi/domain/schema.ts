import { z } from 'zod'
import {
  XIANGQI_COLS,
  XIANGQI_PIECE_TYPES,
  XIANGQI_ROWS,
  XIANGQI_SIDES,
} from './types'

const coordSchema = z.object({
  row: z.number().int().min(0).max(XIANGQI_ROWS - 1),
  col: z.number().int().min(0).max(XIANGQI_COLS - 1),
})

const pieceSchema = z.object({
  side: z.enum(XIANGQI_SIDES),
  type: z.enum(XIANGQI_PIECE_TYPES),
})

export const xiangqiActionSchema = z.object({
  type: z.literal('move'),
  from: coordSchema,
  to: coordSchema,
})

export const xiangqiStateSchema = z.object({
  rows: z.literal(XIANGQI_ROWS),
  cols: z.literal(XIANGQI_COLS),
  cells: z.array(pieceSchema.nullable()).length(XIANGQI_ROWS * XIANGQI_COLS),
  status: z.enum(['playing', 'completed']),
  currentPlayer: z.enum(XIANGQI_SIDES).nullable(),
  winner: z.enum(XIANGQI_SIDES).nullable(),
  endReason: z.enum(['checkmate', 'stalemate', 'no-capture-draw']).nullable(),
  lastMove: z
    .object({
      from: coordSchema,
      to: coordSchema,
      captured: pieceSchema.nullable(),
    })
    .nullable(),
  moveCount: z.number().int().min(0),
  noCapturePlies: z.number().int().min(0),
})